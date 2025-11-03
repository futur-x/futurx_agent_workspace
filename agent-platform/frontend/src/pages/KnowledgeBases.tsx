import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import DocumentChunksModal from '../components/DocumentChunksModal'
import KnowledgeBaseSearch from '../components/KnowledgeBaseSearch'

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
  const [showDocumentsModal, setShowDocumentsModal] = useState(false)
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
      searchMode: 'embedding',
      chunkSize: 1000,
      overlap: 200,
      vectorWeight: 0.7
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
        searchMode: 'embedding',
        chunkSize: 1000,
        overlap: 200,
        vectorWeight: 0.7
      }
    })
  }

  const handleAdd = () => {
    if (!formData.name) {
      toast.error('请填写知识库名称')
      return
    }

    // Validate based on type
    if (formData.type === 'fastgpt') {
      if (!formData.config.apiKey || !formData.config.baseUrl || !formData.config.datasetId) {
        toast.error('请填写所有FastGPT必填字段')
        return
      }
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
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                kb.type === 'local'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {kb.type === 'local' ? '本地向量库' : 'FastGPT'}
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
              {kb.type === 'local' && (
                <button
                  onClick={() => {
                    setSelectedKB(kb)
                    setShowDocumentsModal(true)
                  }}
                  className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                >
                  管理文档
                </button>
              )}
              {kb.type !== 'local' && (
                <button
                  onClick={() => handleTest(kb)}
                  disabled={testMutation.isPending}
                  className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  测试连接
                </button>
              )}
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
                  <option value="fastgpt">FastGPT (外部知识库)</option>
                  <option value="local">本地向量库</option>
                </select>
              </div>

              {formData.type === 'fastgpt' ? (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">FastGPT 配置</h4>

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
                        placeholder="https://api.fastgpt.in"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        示例: https://api.fastgpt.in 或 http://your-domain:3000
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Dataset ID*
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
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">本地向量库配置</h4>

                  <div className="space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <p className="text-xs text-yellow-800">
                        本地知识库需要先在系统配置中配置 Embedding 模型
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          文本块大小 (字符)
                        </label>
                        <input
                          type="number"
                          value={formData.config.chunkSize}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...formData.config,
                                chunkSize: parseInt(e.target.value)
                              }
                            })
                          }
                          className="input-field mt-1"
                          min="100"
                          max="5000"
                        />
                        <p className="text-xs text-gray-500 mt-1">推荐: 500-2000</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          重叠大小 (字符)
                        </label>
                        <input
                          type="number"
                          value={formData.config.overlap}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...formData.config,
                                overlap: parseInt(e.target.value)
                              }
                            })
                          }
                          className="input-field mt-1"
                          min="0"
                          max="1000"
                        />
                        <p className="text-xs text-gray-500 mt-1">推荐: 100-400</p>
                      </div>
                    </div>

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
                        <p className="text-xs text-gray-500 mt-1">推荐: 0.3-0.7</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          向量权重
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={formData.config.vectorWeight}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...formData.config,
                                vectorWeight: parseFloat(e.target.value)
                              }
                            })
                          }
                          className="input-field mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">向量vs关键词权重</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <h5 className="text-xs font-medium text-blue-900 mb-1">检索模式说明</h5>
                      <p className="text-xs text-blue-800">
                        混合检索 = 向量相似度 × 向量权重 + 关键词匹配 × (1 - 向量权重)
                      </p>
                    </div>
                  </div>
                </div>
              )}
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

      {/* Permissions Modal */}
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

      {/* Documents Modal */}
      {showDocumentsModal && selectedKB && selectedKB.type === 'local' && (
        <DocumentsManager
          knowledgeBase={selectedKB}
          onClose={() => {
            setShowDocumentsModal(false)
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

// Documents Manager Component
const DocumentsManager = ({
  knowledgeBase,
  onClose
}: {
  knowledgeBase: KnowledgeBase
  onClose: () => void
}) => {
  const queryClient = useQueryClient()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null)
  const [showChunksModal, setShowChunksModal] = useState(false)
  const [showSearchPanel, setShowSearchPanel] = useState(false)

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', knowledgeBase.id],
    queryFn: async () => {
      const response = await api.get(`/knowledge-bases/${knowledgeBase.id}/documents`)
      return response.data.documents
    }
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post(`/knowledge-bases/${knowledgeBase.id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', knowledgeBase.id] })
      setSelectedFile(null)
      toast.success('文档上传并向量化成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '文档上传失败')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      return api.delete(`/documents/${docId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', knowledgeBase.id] })
      toast.success('文档已删除')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '删除失败')
    }
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('请先选择文件')
      return
    }
    uploadMutation.mutate(selectedFile)
  }

  const handleDelete = (doc: any) => {
    if (confirm(`确定要删除文档 "${doc.fileName}" 吗？`)) {
      deleteMutation.mutate(doc.id)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">文档管理</h3>
            <p className="text-sm text-gray-600 mt-1">知识库: {knowledgeBase.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Upload Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h4 className="font-medium text-gray-900 mb-3">上传文档</h4>
          <div className="flex items-center space-x-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".txt,.md,.markdown,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                选择文件
              </span>
            </label>
            <span className="text-sm text-gray-600">
              {selectedFile ? selectedFile.name : '支持: .txt, .md, .doc, .docx (最大10MB)'}
            </span>
            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="btn-primary"
              >
                {uploadMutation.isPending ? '上传中...' : '开始上传'}
              </button>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">已上传文档 ({documents?.length || 0})</h4>

          {isLoading ? (
            <p className="text-gray-500 text-center py-8">加载中...</p>
          ) : documents && documents.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">{doc.fileName}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {doc.fileType}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <span>大小: {formatFileSize(doc.fileSize)}</span>
                      <span>块数: {doc.chunkCount}</span>
                      <span>上传: {new Date(doc.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedDocument(doc)
                        setShowChunksModal(true)
                      }}
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      查看Chunks
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deleteMutation.isPending}
                      className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>暂无文档</p>
              <p className="text-sm mt-1">上传文档后将自动进行向量化处理</p>
            </div>
          )}
        </div>

        {/* Test Search Section */}
        <div className="mt-6 border-t pt-4">
          <button
            onClick={() => setShowSearchPanel(!showSearchPanel)}
            className="w-full btn-secondary flex items-center justify-center"
          >
            {showSearchPanel ? '隐藏测试搜索' : '显示测试搜索'}
          </button>
        </div>

        {showSearchPanel && (
          <div className="mt-4">
            <KnowledgeBaseSearch
              knowledgeBaseId={knowledgeBase.id}
              knowledgeBaseName={knowledgeBase.name}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            关闭
          </button>
        </div>
      </div>

      {/* Document Chunks Modal */}
      {showChunksModal && selectedDocument && (
        <DocumentChunksModal
          documentId={selectedDocument.id}
          documentName={selectedDocument.fileName}
          onClose={() => {
            setShowChunksModal(false)
            setSelectedDocument(null)
          }}
        />
      )}
    </div>
  )
}

export default KnowledgeBases
