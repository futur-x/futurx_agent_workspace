import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'

const Tasks = () => {
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
      setError(error.response?.data?.message || 'Operation failed')
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
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate(id)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingTask(null)
    setFormData({ name: '', promptTemplate: '' })
    setError('')
  }

  if (isLoading) {
    return <div>Loading tasks...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          Add Task
        </button>
      </div>

      {/* Task Form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-medium mb-4">
            {editingTask ? 'Edit Task' : 'Add New Task'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
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
                Prompt Template
              </label>
              <textarea
                required
                rows={8}
                value={formData.promptTemplate}
                onChange={(e) => setFormData({ ...formData, promptTemplate: e.target.value })}
                className="input-field mt-1"
                placeholder="Enter your prompt template. Use {input_text} for user input and {file_content} for file content."
              />
              <p className="mt-1 text-sm text-gray-500">
                Available placeholders: {'{input_text}'}, {'{file_content}'}
              </p>
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {editingTask ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
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
                      <span className="text-xs text-gray-500">Placeholders: </span>
                      {task.placeholders.map((p: string) => (
                        <span key={p} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded mr-1">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Created: {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(task)}
                    className="text-blue-600 hover:text-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-red-600 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center text-gray-500">
            No tasks configured yet. Add your first task template to get started.
          </div>
        )}
      </div>
    </div>
  )
}

export default Tasks