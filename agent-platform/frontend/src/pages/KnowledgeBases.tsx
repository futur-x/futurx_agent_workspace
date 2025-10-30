import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface KnowledgeBase {
  id: string
  name: string
  description?: string
  type: string
  isActive: boolean
  createdBy: string
  createdAt: string
  creator: {
    id: string
    username: string
  }
  userKnowledgeBases: Array<{
    user: {
      id: string
      username: string
    }
  }>
  _count: {
    generationKnowledges: number
  }
}

const KnowledgeBases = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'fastgpt',
    config: {
      apiKey: '',
      baseUrl: '',
      datasetId: '',
      limit: 5000,
      similarity: 0.4,
      searchMode: 'embedding'
    }
  })

  const { data: knowledgeBases, isLoading } = useQuery({
    queryKey: ['knowledgeBases'],
    queryFn: async () => {
      const response = await api.get('/knowledge-bases')
      return response.data.knowledgeBases
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/knowledge-bases', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] })
      setShowAddModal(false)
      resetForm()
      toast.success('知识库创建成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '创建失败')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      return api.put(`/knowledge-bases/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] })
      setShowEditModal(false)
      setSelectedKB(null)
      resetForm()
      toast.success('知识库更新成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '更新失败')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/knowledge-bases/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] })
      toast.success('知识库删除成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '删除失败')
    }
  })

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/knowledge-bases/${id}/test`)
    },
    onSuccess: (response) => {
      toast.success(response.data.message || '连接测试成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '连接测试失败')
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'fastgpt',
      config: {
        apiKey: '',
        baseUrl: '',
        datasetId: '',
        limit: 5000,
        similarity: 0.4,
        searchMode: 'embedding'
      }
    })
  }

  const handleAdd = () => {
    if (!formData.name || !formData.config.apiKey) {
      toast.error('请填写必填字段')
      return
    }
    createMutation.mutate(formData)
  }

  const handleEdit = () => {
    if (!selectedKB) return
    const updateData: any = {
      name: formData.name,
      description: formData.description,
      config: formData.config
    }
    updateMutation.mutate({ id: selectedKB.id, data: updateData })
  }

  const handleDelete = (kb: KnowledgeBase) => {
    if (confirm(`确定要删除知识库 "${kb.name}" 吗？`)) {
      deleteMutation.mutate(kb.id)
    }
  }

  const handleTest = (kb: KnowledgeBase) => {
    testMutation.mutate(kb.id)
  }

  const openEditModal = async (kb: KnowledgeBase) => {
    // Fetch full details including config
    try {
      const response = await api.get(`/knowledge-bases/${kb.id}`)
      const fullKB = response.data.knowledgeBase
      setSelectedKB(fullKB)
      setFormData({
        name: fullKB.name,
        description: fullKB.description || '',
        type: fullKB.type,
        config: JSON.parse(fullKB.config)
      })
      setShowEditModal(true)
    } catch (error: any) {
      toast.error('获取知识库详情失败')
    }
  }

  const openPermissionsModal = (kb: KnowledgeBase) => {
    setSelectedKB(kb)
    setShowPermissionsModal(true)
  }

  if (isLoading) {
    return <div className="px-4 py-6">加载知识库列表中...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">知识库管理</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          添加知识库
        </button>
      </div>

      {/* Knowledge Bases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {knowledgeBases?.map((kb: KnowledgeBase) => (
          <div key={kb.id} className="card">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{kb.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{kb.description || '暂无描述'}</p>
              </div>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  kb.type === 'fastgpt'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {kb.type === 'fastgpt' ? 'FastGPT' : 'Dify'}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex justify-between">
                <span>创建者:</span>
                <span className="font-medium">{kb.creator.username}</span>
              </div>
              <div className="flex justify-between">
                <span>使用次数:</span>
                <span className="font-medium">{kb._count.generationKnowledges}</span>
              </div>
              <div className="flex justify-between">
                <span>状态:</span>
                <span
                  className={`font-medium ${kb.isActive ? 'text-green-600' : 'text-red-600'}`}
                >
                  {kb.isActive ? '活跃' : '停用'}
                </span>
              </div>
              {kb.userKnowledgeBases.length > 0 && (
                <div className="flex justify-between">
                  <span>授权用户:</span>
                  <span className="font-medium">{kb.userKnowledgeBases.length}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTest(kb)}
                disabled={testMutation.isPending}
                className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                测试连接
              </button>
              <button
                onClick={() => openEditModal(kb)}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                编辑
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={() => openPermissionsModal(kb)}
                  className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  权限
                </button>
              )}
              {(user?.role === 'admin' || kb.createdBy === user?.id) && (
                <button
                  onClick={() => handleDelete(kb)}
                  disabled={deleteMutation.isPending}
                  className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {knowledgeBases?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无知识库，点击右上角添加</p>
        </div>
      )}

      {/* Add/Edit Modal - To be implemented in next step */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">
              {showAddModal ? '添加知识库' : '编辑知识库'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">知识库名称*</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field mt-1"
                  placeholder="输入知识库名称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field mt-1"
                  rows={2}
                  placeholder="输入知识库描述"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">类型*</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input-field mt-1"
                  disabled={showEditModal}
                >
                  <option value="fastgpt">FastGPT</option>
                  <option value="dify">Dify</option>
                </select>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">API 配置</h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">API Key*</label>
                    <input
                      type="password"
                      value={formData.config.apiKey}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, apiKey: e.target.value }
                        })
                      }
                      className="input-field mt-1"
                      placeholder="输入 API Key"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Base URL*</label>
                    <input
                      type="text"
                      value={formData.config.baseUrl}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, baseUrl: e.target.value }
                        })
                      }
                      className="input-field mt-1"
                      placeholder={
                        formData.type === 'fastgpt'
                          ? 'https://api.fastgpt.in'
                          : 'https://your-dify-api.com'
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {formData.type === 'fastgpt' ? 'Dataset ID*' : 'Knowledge ID*'}
                    </label>
                    <input
                      type="text"
                      value={formData.config.datasetId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, datasetId: e.target.value }
                        })
                      }
                      className="input-field mt-1"
                      placeholder="输入知识库 ID"
                    />
                  </div>

                  {formData.type === 'fastgpt' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            相似度阈值
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={formData.config.similarity}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                config: {
                                  ...formData.config,
                                  similarity: parseFloat(e.target.value)
                                }
                              })
                            }
                            className="input-field mt-1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            返回限制 (tokens)
                          </label>
                          <input
                            type="number"
                            value={formData.config.limit}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                config: {
                                  ...formData.config,
                                  limit: parseInt(e.target.value)
                                }
                              })
                            }
                            className="input-field mt-1"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  showAddModal ? setShowAddModal(false) : setShowEditModal(false)
                  resetForm()
                  setSelectedKB(null)
                }}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={showAddModal ? handleAdd : handleEdit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary"
              >
                {showAddModal ? '添加' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal placeholder */}
      {showPermissionsModal && selectedKB && (
        <KnowledgeBasePermissions
          knowledgeBaseId={selectedKB.id}
          knowledgeBaseName={selectedKB.name}
          onClose={() => {
            setShowPermissionsModal(false)
            setSelectedKB(null)
          }}
        />
      )}
    </div>
  )
}

// Permissions Component
const KnowledgeBasePermissions = ({
  knowledgeBaseId,
  knowledgeBaseName,
  onClose
}: {
  knowledgeBaseId: string
  knowledgeBaseName: string
  onClose: () => void
}) => {
  const queryClient = useQueryClient()
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['knowledgeBasePermissions', knowledgeBaseId],
    queryFn: async () => {
      const response = await api.get(`/knowledge-bases/${knowledgeBaseId}/permissions`)
      setSelectedUserIds(response.data.assignedUsers.map((u: any) => u.id))
      return response.data
    }
  })

  const updatePermissionsMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      return api.put(`/knowledge-bases/${knowledgeBaseId}/permissions`, { userIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] })
      queryClient.invalidateQueries({ queryKey: ['knowledgeBasePermissions', knowledgeBaseId] })
      toast.success('权限更新成功')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '权限更新失败')
    }
  })

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSave = () => {
    updatePermissionsMutation.mutate(selectedUserIds)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <p>加载权限数据中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium mb-4">管理知识库权限</h3>
        <p className="text-sm text-gray-600 mb-4">知识库: {knowledgeBaseName}</p>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {permissionsData?.availableUsers.map((user: any) => (
            <label key={user.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedUserIds.includes(user.id)}
                onChange={() => handleToggleUser(user.id)}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">{user.username}</span>
                <span className="ml-2 text-xs text-gray-500">({user.role})</span>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={updatePermissionsMutation.isPending}
            className="btn-primary"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

export default KnowledgeBases
