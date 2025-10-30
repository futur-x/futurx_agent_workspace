import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../utils/api'
import ReactMarkdown from 'react-markdown'

const Generate = () => {
  // Load saved selections from localStorage
  const [selectedAgent, setSelectedAgent] = useState(() => {
    return localStorage.getItem('lastSelectedAgent') || ''
  })
  const [selectedTask, setSelectedTask] = useState(() => {
    return localStorage.getItem('lastSelectedTask') || ''
  })
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState<string[]>(() => {
    const saved = localStorage.getItem('lastSelectedKnowledgeBases')
    return saved ? JSON.parse(saved) : []
  })
  const [inputText, setInputText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [generationResult, setGenerationResult] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await api.get('/agents')
      return response.data.agents
    }
  })

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks')
      return response.data.tasks
    }
  })

  const { data: knowledgeBases } = useQuery({
    queryKey: ['knowledgeBases'],
    queryFn: async () => {
      const response = await api.get('/knowledge-bases')
      return response.data.knowledgeBases
    }
  })

  // Save selections to localStorage when they change
  useEffect(() => {
    if (selectedAgent) {
      localStorage.setItem('lastSelectedAgent', selectedAgent)
    }
  }, [selectedAgent])

  useEffect(() => {
    if (selectedTask) {
      localStorage.setItem('lastSelectedTask', selectedTask)
    }
  }, [selectedTask])

  useEffect(() => {
    localStorage.setItem('lastSelectedKnowledgeBases', JSON.stringify(selectedKnowledgeBases))
  }, [selectedKnowledgeBases])

  // Validate saved selections still exist
  useEffect(() => {
    if (agents && selectedAgent) {
      const agentExists = agents.some((agent: any) => agent.id === selectedAgent)
      if (!agentExists) {
        setSelectedAgent('')
        localStorage.removeItem('lastSelectedAgent')
      }
    }
  }, [agents, selectedAgent])

  useEffect(() => {
    if (tasks && selectedTask) {
      const taskExists = tasks.some((task: any) => task.id === selectedTask)
      if (!taskExists) {
        setSelectedTask('')
        localStorage.removeItem('lastSelectedTask')
      }
    }
  }, [tasks, selectedTask])

  useEffect(() => {
    if (knowledgeBases && selectedKnowledgeBases.length > 0) {
      const validKBs = selectedKnowledgeBases.filter(kbId =>
        knowledgeBases.some((kb: any) => kb.id === kbId)
      )
      if (validKBs.length !== selectedKnowledgeBases.length) {
        setSelectedKnowledgeBases(validKBs)
      }
    }
  }, [knowledgeBases, selectedKnowledgeBases])

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: (data) => {
      setFileContent(data.content)
    }
  })

  const generateMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await api.post('/generation/start', params)
      return response.data
    },
    onSuccess: async (data) => {
      // Start polling for results using the streamUrl from response
      pollForResults(data.streamUrl || `/api/generation/stream?generationId=${data.generationId}`)
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || '生成失败')
      setIsGenerating(false)
    }
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFile(file)
      uploadMutation.mutate(file)
    }
  }

  const handleGenerate = async () => {
    if (!selectedAgent || !selectedTask) {
      setError('请同时选择智能体和任务')
      return
    }

    if (!inputText && !fileContent) {
      setError('请提供文本输入或上传文件')
      return
    }

    setError('')
    setGenerationResult('')
    setIsGenerating(true)

    const params = {
      agentId: selectedAgent,
      taskId: selectedTask,
      knowledgeBaseIds: selectedKnowledgeBases, // Add knowledge base selection
      input: {
        text: inputText,
        fileName: file?.name,
        fileContent: fileContent
      }
    }

    generateMutation.mutate(params)
  }

  const pollForResults = async (streamUrl: string) => {
    let eventSource: EventSource | null = null
    let retryCount = 0
    const maxRetries = 3
    let connectionTimeout: number | null = null
    let lastEventTime = Date.now()

    const createConnection = () => {
      eventSource = new EventSource(streamUrl)

      // Reset connection timeout on new connection
      if (connectionTimeout) {
        clearTimeout(connectionTimeout)
      }

      // Set a timeout to detect stalled connections
      connectionTimeout = setTimeout(() => {
        if (Date.now() - lastEventTime > 30000 && eventSource) { // 30 seconds without events
          console.log('Connection timeout, attempting reconnect...')
          eventSource.close()
          if (retryCount < maxRetries) {
            retryCount++
            setTimeout(createConnection, 1000 * retryCount) // Exponential backoff
          } else {
            setError('连接超时，请刷新页面重试')
            setIsGenerating(false)
          }
        }
      }, 30000)

      eventSource.onopen = () => {
        console.log('SSE connection established')
        retryCount = 0 // Reset retry count on successful connection
        lastEventTime = Date.now()
      }

      eventSource.onmessage = (event) => {
        lastEventTime = Date.now()

        try {
          const data = JSON.parse(event.data)

          if (data.event === 'complete') {
            setGenerationResult(data.content)
            setIsGenerating(false)
            if (connectionTimeout) clearTimeout(connectionTimeout)
            eventSource?.close()
          } else if (data.event === 'error') {
            setError(data.message)
            setIsGenerating(false)
            if (connectionTimeout) clearTimeout(connectionTimeout)
            eventSource?.close()
          } else if (data.event === 'progress') {
            // Show progress message to user
            console.log('Progress:', data.message)
          } else if (data.event === 'connected') {
            console.log('Connected to SSE stream')
          } else if (data.chunk) {
            setGenerationResult((prev) => prev + data.chunk)
          }
        } catch (e) {
          console.error('Error parsing SSE message:', e)
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE error:', error)

        if (eventSource?.readyState === EventSource.CLOSED) {
          // Connection was closed, attempt to reconnect
          if (retryCount < maxRetries) {
            retryCount++
            console.log(`Attempting reconnect (${retryCount}/${maxRetries})...`)
            setTimeout(createConnection, 1000 * retryCount)
          } else {
            setError('连接丢失，多次重连失败')
            setIsGenerating(false)
            if (connectionTimeout) clearTimeout(connectionTimeout)
          }
        }
      }
    }

    createConnection()
  }

  const handleDownload = () => {
    const blob = new Blob([generationResult], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `generation-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">生成内容</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-medium mb-4">配置</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">选择智能体</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="input-field mt-1"
                >
                  <option value="">选择一个智能体...</option>
                  {agents?.map((agent: any) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">选择任务</label>
                <select
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                  className="input-field mt-1"
                >
                  <option value="">选择一个任务...</option>
                  {tasks?.map((task: any) => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择知识库
                  <span className="text-xs text-gray-500 ml-2">（可多选，可不选）</span>
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto bg-white">
                  {knowledgeBases && knowledgeBases.length > 0 ? (
                    <div className="space-y-2">
                      {knowledgeBases.map((kb: any) => (
                        <label
                          key={kb.id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedKnowledgeBases.includes(kb.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedKnowledgeBases([...selectedKnowledgeBases, kb.id])
                              } else {
                                setSelectedKnowledgeBases(
                                  selectedKnowledgeBases.filter((id) => id !== kb.id)
                                )
                              }
                            }}
                            className="form-checkbox h-4 w-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">{kb.name}</span>
                            {kb.description && (
                              <p className="text-xs text-gray-500">{kb.description}</p>
                            )}
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              kb.type === 'fastgpt'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {kb.type === 'fastgpt' ? 'FastGPT' : 'Dify'}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      暂无可用知识库，请先在知识库管理页面创建
                    </p>
                  )}
                </div>
                {selectedKnowledgeBases.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    已选择 {selectedKnowledgeBases.length} 个知识库
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-medium mb-4">输入内容</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">文本输入</label>
                <textarea
                  rows={6}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="input-field mt-1"
                  placeholder="在此输入您的文本内容..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  文件上传
                  <span className="text-xs text-gray-500 ml-2">（仅支持 .txt 和 .md 文件）</span>
                </label>
                <div className="mt-1 flex items-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".txt,.md,.markdown"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <span className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      选择文件
                    </span>
                  </label>
                  <span className="ml-3 text-sm text-gray-500">
                    {file ? file.name : '未选择文件'}
                  </span>
                </div>
                {fileContent && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <p className="font-medium text-gray-700">文件预览：</p>
                    <p className="text-gray-500 mt-1">
                      {fileContent.substring(0, 100)}...
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-primary mt-4 w-full"
            >
              {isGenerating ? '生成中...' : '生成内容'}
            </button>
          </div>
        </div>

        {/* Output Section */}
        <div className="card h-fit">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">生成的内容</h2>
            {generationResult && (
              <button onClick={handleDownload} className="text-blue-600 hover:text-blue-500 text-sm">
                下载
              </button>
            )}
          </div>

          <div className="min-h-[400px] border border-gray-200 rounded-lg p-4 bg-gray-50">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">正在生成内容...</p>
                </div>
              </div>
            ) : generationResult ? (
              <div className="prose max-w-none">
                <ReactMarkdown>{generationResult}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                生成的内容将显示在这里
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Generate