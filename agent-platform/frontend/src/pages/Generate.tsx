import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../utils/api'
import ReactMarkdown from 'react-markdown'

const Generate = () => {
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
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
      input: {
        text: inputText,
        fileName: file?.name,
        fileContent: fileContent
      }
    }

    generateMutation.mutate(params)
  }

  const pollForResults = async (streamUrl: string) => {
    const eventSource = new EventSource(streamUrl)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.event === 'complete') {
        setGenerationResult(data.content)
        setIsGenerating(false)
        eventSource.close()
      } else if (data.event === 'error') {
        setError(data.message)
        setIsGenerating(false)
        eventSource.close()
      } else if (data.chunk) {
        setGenerationResult((prev) => prev + data.chunk)
      }
    }

    eventSource.onerror = () => {
      setError('连接丢失')
      setIsGenerating(false)
      eventSource.close()
    }
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
                <label className="block text-sm font-medium text-gray-700">文件上传</label>
                <input
                  type="file"
                  accept=".txt,.md,.markdown"
                  onChange={handleFileChange}
                  className="mt-1"
                />
                {fileContent && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <p className="font-medium text-gray-700">已加载文件：{file?.name}</p>
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