import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'

const Agents = () => {
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    apiToken: ''
  })
  const [error, setError] = useState('')

  const queryClient = useQueryClient()

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await api.get('/agents')
      return response.data.agents
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return editingAgent
        ? api.put(`/agents/${editingAgent.id}`, data)
        : api.post('/agents', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      resetForm()
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || '操作失败')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/agents/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    }
  })

  const validateMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/agents/validate', data)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate connection first
    const validation = await validateMutation.mutateAsync(formData)
    if (!validation.data.valid) {
      setError('连接智能体失败。请检查URL和API令牌。')
      return
    }

    createMutation.mutate(formData)
  }

  const handleEdit = (agent: any) => {
    setEditingAgent(agent)
    setFormData({
      name: agent.name,
      url: agent.url,
      apiToken: agent.apiToken
    })
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个智能体吗？')) {
      deleteMutation.mutate(id)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingAgent(null)
    setFormData({ name: '', url: '', apiToken: '' })
    setError('')
  }

  if (isLoading) {
    return <div>加载智能体中...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">智能体</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          添加智能体
        </button>
      </div>

      {/* Agent Form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-medium mb-4">
            {editingAgent ? '编辑智能体' : '添加新智能体'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">名称</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">API 地址</label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="input-field mt-1"
                placeholder="https://api.dify.ai/v1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">API 令牌</label>
              <input
                type="text"
                required
                value={formData.apiToken}
                onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                className="input-field mt-1"
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {editingAgent ? '更新' : '创建'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agents List */}
      <div className="grid gap-4">
        {agents && agents.length > 0 ? (
          agents.map((agent: any) => (
            <div key={agent.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{agent.name}</h3>
                  <p className="text-sm text-gray-500">{agent.url}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    创建时间：{new Date(agent.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(agent)}
                    className="text-blue-600 hover:text-blue-500"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    className="text-red-600 hover:text-red-500"
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                  agent.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {agent.isActive ? '活跃' : '未激活'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center text-gray-500">
            还没有配置任何智能体。添加您的第一个智能体开始使用。
          </div>
        )}
      </div>
    </div>
  )
}

export default Agents