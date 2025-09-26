import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const Tasks = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // 权限检查：只有管理员才能访问此页面
  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard')
    }
  }, [user, navigate])
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    promptTemplate: ''
  })
  const [error, setError] = useState('')

  const queryClient = useQueryClient()

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks')
      return response.data.tasks
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return editingTask
        ? api.put(`/tasks/${editingTask.id}`, data)
        : api.post('/tasks', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      resetForm()
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || '操作失败')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/tasks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate(formData)
  }

  const handleEdit = (task: any) => {
    setEditingTask(task)
    setFormData({
      name: task.name,
      promptTemplate: task.promptTemplate
    })
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      deleteMutation.mutate(id)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingTask(null)
    setFormData({ name: '', promptTemplate: '' })
    setError('')
  }

  // 如果不是管理员，不渲染页面内容
  if (user?.role !== 'admin') {
    return null
  }

  if (isLoading) {
    return <div>加载任务中...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">任务模板</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          添加任务
        </button>
      </div>

      {/* Task Form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-medium mb-4">
            {editingTask ? '编辑任务' : '添加新任务'}
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
              <label className="block text-sm font-medium text-gray-700">
                提示词模板
              </label>
              <textarea
                required
                rows={8}
                value={formData.promptTemplate}
                onChange={(e) => setFormData({ ...formData, promptTemplate: e.target.value })}
                className="input-field mt-1"
                placeholder="输入您的提示词模板。使用 {input_text} 代表用户输入，{file_content} 代表文件内容。"
              />
              <p className="mt-1 text-sm text-gray-500">
                可用占位符：{'{input_text}'}, {'{file_content}'}
              </p>
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {editingTask ? '更新' : '创建'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks List */}
      <div className="grid gap-4">
        {tasks && tasks.length > 0 ? (
          tasks.map((task: any) => (
            <div key={task.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{task.name}</h3>
                  <pre className="text-sm text-gray-600 mt-2 whitespace-pre-wrap font-sans">
                    {task.promptTemplate.length > 200
                      ? task.promptTemplate.substring(0, 200) + '...'
                      : task.promptTemplate}
                  </pre>
                  {task.placeholders && task.placeholders.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">占位符：</span>
                      {task.placeholders.map((p: string) => (
                        <span key={p} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded mr-1">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    创建时间：{new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(task)}
                    className="text-blue-600 hover:text-blue-500"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-red-600 hover:text-red-500"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center text-gray-500">
            还没有配置任何任务。添加您的第一个任务模板开始使用。
          </div>
        )}
      </div>
    </div>
  )
}

export default Tasks