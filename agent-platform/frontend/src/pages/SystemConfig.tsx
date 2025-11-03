import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const SystemConfig = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo'
  })

  const [embeddingFormData, setEmbeddingFormData] = useState({
    apiKey: '',
    baseUrl: '',
    model: 'text-embedding-3-small'
  })

  // Redirect if not admin
  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const { data: config, isLoading } = useQuery({
    queryKey: ['systemConfig', 'query_ai_model'],
    queryFn: async () => {
      const response = await api.get('/system-config/query_ai_model')
      return response.data.config
    },
    enabled: user?.role === 'admin'
  })

  const { data: embeddingConfig, isLoading: isEmbeddingLoading } = useQuery({
    queryKey: ['systemConfig', 'embedding_model'],
    queryFn: async () => {
      const response = await api.get('/system-config/embedding_model')
      return response.data.config
    },
    enabled: user?.role === 'admin'
  })

  useEffect(() => {
    if (config && config.exists) {
      setFormData(config.value)
    }
  }, [config])

  useEffect(() => {
    if (embeddingConfig && embeddingConfig.exists) {
      setEmbeddingFormData(embeddingConfig.value)
    }
  }, [embeddingConfig])

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/system-config', {
        key: 'query_ai_model',
        value: data
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemConfig', 'query_ai_model'] })
      toast.success('系统配置保存成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '保存失败')
    }
  })

  const testMutation = useMutation({
    mutationFn: async () => {
      // Test API connection by making a simple request
      const response = await fetch(formData.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${formData.apiKey}`
        },
        body: JSON.stringify({
          model: formData.model,
          messages: [{ role: 'user', content: '测试' }],
          max_tokens: 10
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()
    },
    onSuccess: (data) => {
      console.log('Test successful:', data)
      toast.success('API 连接测试成功！模型响应正常')
    },
    onError: (error: any) => {
      console.error('Test failed:', error)
      toast.error(`API 连接测试失败: ${error.message || '请检查配置'}`)
    }
  })

  const saveEmbeddingMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/system-config', {
        key: 'embedding_model',
        value: data
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemConfig', 'embedding_model'] })
      toast.success('Embedding模型配置保存成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '保存失败')
    }
  })

  const testEmbeddingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(embeddingFormData.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${embeddingFormData.apiKey}`
        },
        body: JSON.stringify({
          model: embeddingFormData.model,
          input: '测试文本'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()
    },
    onSuccess: (data) => {
      console.log('Embedding test successful:', data)
      toast.success('Embedding API 连接测试成功！')
    },
    onError: (error: any) => {
      console.error('Embedding test failed:', error)
      toast.error(`Embedding API 测试失败: ${error.message || '请检查配置'}`)
    }
  })

  const handleSave = () => {
    if (!formData.apiKey || !formData.baseUrl || !formData.model) {
      toast.error('请填写所有必填字段')
      return
    }
    saveMutation.mutate(formData)
  }

  const handleTest = () => {
    if (!formData.apiKey || !formData.baseUrl || !formData.model) {
      toast.error('请先填写完整配置')
      return
    }
    testMutation.mutate()
  }

  const handleSaveEmbedding = () => {
    if (!embeddingFormData.apiKey || !embeddingFormData.baseUrl || !embeddingFormData.model) {
      toast.error('请填写所有必填字段')
      return
    }

    // Validate URL format
    const url = embeddingFormData.baseUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('Base URL 必须以 http:// 或 https:// 开头')
      return
    }

    // Warn if URL doesn't look like an embeddings endpoint
    const urlLower = url.toLowerCase()
    if (!urlLower.includes('embedding') && !urlLower.endsWith('/')) {
      toast.error('URL 看起来不是 embeddings 端点，通常应包含 "embedding" 或以 / 结尾。例如：https://api.openai.com/v1/embeddings')
      return
    }

    saveEmbeddingMutation.mutate(embeddingFormData)
  }

  const handleTestEmbedding = () => {
    if (!embeddingFormData.apiKey || !embeddingFormData.baseUrl || !embeddingFormData.model) {
      toast.error('请先填写完整配置')
      return
    }

    // Validate URL format
    const url = embeddingFormData.baseUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('Base URL 必须以 http:// 或 https:// 开头')
      return
    }

    // Warn if URL doesn't look like an embeddings endpoint
    const urlLower = url.toLowerCase()
    if (!urlLower.includes('embedding') && !urlLower.endsWith('/')) {
      toast.error('URL 看起来不是 embeddings 端点，通常应包含 "embedding" 或以 / 结尾。例如：https://api.openai.com/v1/embeddings')
      return
    }

    testEmbeddingMutation.mutate()
  }

  if (isLoading || isEmbeddingLoading) {
    return <div className="px-4 py-6">加载系统配置中...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">系统配置</h1>
        <p className="text-sm text-gray-600 mt-2">
          配置用于生成知识库查询关键词的通用 AI 模型
        </p>
      </div>

      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">查询关键词生成 AI 模型</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              API Key *
              <span className="text-xs text-gray-500 ml-2">(用于生成查询关键词)</span>
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              className="input-field mt-1"
              placeholder="sk-..."
            />
            <p className="text-xs text-gray-500 mt-1">
              此 API Key 将用于调用 AI 模型，从用户输入、文件内容和任务模板中智能提取查询关键词
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Base URL *</label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              className="input-field mt-1"
              placeholder="https://api.openai.com/v1/chat/completions"
            />
            <p className="text-xs text-gray-500 mt-1">
              支持 OpenAI 兼容的 API 端点（如 Azure OpenAI, 本地部署的模型等）
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">模型名称 *</label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="input-field mt-1"
              placeholder="gpt-3.5-turbo"
            />
            <p className="text-xs text-gray-500 mt-1">
              推荐使用 gpt-3.5-turbo 或 gpt-4 等模型
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">工作原理</h3>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>用户提交任务时，系统会收集：用户输入、上传文件内容、任务模板</li>
              <li>这些信息会发送给配置的 AI 模型，生成最适合的查询关键词</li>
              <li>使用生成的关键词查询用户有权限的所有知识库</li>
              <li>将检索到的知识库内容作为上下文，与原始输入一起发送给 Agent</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleTest}
            disabled={testMutation.isPending}
            className="btn-secondary"
          >
            {testMutation.isPending ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="btn-primary"
          >
            {saveMutation.isPending ? '保存中...' : '保存配置'}
          </button>
        </div>

        {config && config.exists && (
          <div className="mt-4 text-xs text-gray-500">
            最后更新: {new Date(config.updatedAt).toLocaleString('zh-CN')}
          </div>
        )}
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Embedding 向量化模型</h2>
        <p className="text-sm text-gray-600 mb-4">
          配置用于本地知识库文本向量化的 Embedding 模型
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              API Key *
              <span className="text-xs text-gray-500 ml-2">(用于文本向量化)</span>
            </label>
            <input
              type="password"
              value={embeddingFormData.apiKey}
              onChange={(e) => setEmbeddingFormData({ ...embeddingFormData, apiKey: e.target.value })}
              className="input-field mt-1"
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Base URL *</label>
            <input
              type="text"
              value={embeddingFormData.baseUrl}
              onChange={(e) => setEmbeddingFormData({ ...embeddingFormData, baseUrl: e.target.value })}
              className="input-field mt-1"
              placeholder="https://api.openai.com/v1/embeddings"
            />
            <p className="text-xs text-gray-500 mt-1">
              <strong>必须是完整的 embeddings 端点 URL，例如：</strong>
            </p>
            <ul className="text-xs text-gray-500 mt-1 ml-4 list-disc">
              <li>OpenAI: https://api.openai.com/v1/embeddings</li>
              <li>LiteLLM: https://your-domain.com/v1/embeddings</li>
              <li>通义千问: https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">模型名称 *</label>
            <input
              type="text"
              value={embeddingFormData.model}
              onChange={(e) => setEmbeddingFormData({ ...embeddingFormData, model: e.target.value })}
              className="input-field mt-1"
              placeholder="text-embedding-3-small"
            />
            <p className="text-xs text-gray-500 mt-1">
              推荐: text-embedding-3-small (OpenAI) 或其他兼容模型
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-green-900 mb-2">使用说明</h3>
            <ul className="text-xs text-green-800 space-y-1 list-disc list-inside">
              <li>创建本地知识库时,上传的文档会通过此模型转换为向量</li>
              <li>向量存储在 ChromaDB 中,支持语义检索</li>
              <li>支持混合检索: 语义相似度 + 关键词匹配</li>
              <li>向量维度由模型决定,无需手动配置</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleTestEmbedding}
            disabled={testEmbeddingMutation.isPending}
            className="btn-secondary"
          >
            {testEmbeddingMutation.isPending ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSaveEmbedding}
            disabled={saveEmbeddingMutation.isPending}
            className="btn-primary"
          >
            {saveEmbeddingMutation.isPending ? '保存中...' : '保存配置'}
          </button>
        </div>

        {embeddingConfig && embeddingConfig.exists && (
          <div className="mt-4 text-xs text-gray-500">
            最后更新: {new Date(embeddingConfig.updatedAt).toLocaleString('zh-CN')}
          </div>
        )}
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">注意事项</h2>
        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
          <li>请确保 API Key 有足够的调用额度</li>
          <li>建议使用较新的模型以获得更好的关键词提取效果</li>
          <li>系统会自动限制每次查询的 token 数量（约 100 tokens）</li>
          <li>生成失败时，系统会使用用户的原始输入作为关键词</li>
          <li>此配置仅影响知识库查询关键词的生成，不影响 Agent 本身的响应</li>
          <li>Embedding 模型用于本地知识库的文本向量化,与外部知识库无关</li>
        </ul>
      </div>
    </div>
  )
}

export default SystemConfig
