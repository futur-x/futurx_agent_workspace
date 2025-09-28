import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import UserPermissions from '../components/UserPermissions'

const Users = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user'
  })

  // Redirect if not admin
  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data.users
    },
    enabled: user?.role === 'admin'
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/users', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowAddModal(false)
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      return api.put(`/users/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowEditModal(false)
      setSelectedUser(null)
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/users/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'user'
    })
  }

  const handleAdd = () => {
    createMutation.mutate(formData)
  }

  const handleEdit = () => {
    const updateData: any = {}
    if (formData.password) updateData.password = formData.password
    if (formData.role !== selectedUser.role) updateData.role = formData.role

    updateMutation.mutate({
      id: selectedUser.id,
      data: updateData
    })
  }

  const handleDelete = (userId: string) => {
    if (userId === user?.id) {
      alert('不能删除自己的账户')
      return
    }
    if (confirm('确定要删除这个用户吗？')) {
      deleteMutation.mutate(userId)
    }
  }

  const openEditModal = (user: any) => {
    setSelectedUser(user)
    setFormData({
      username: user.username,
      password: '',
      role: user.role
    })
    setShowEditModal(true)
  }

  if (isLoading) {
    return <div>加载用户列表中...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">用户管理</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          添加用户
        </button>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                角色
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                生成次数
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users?.map((u: any) => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{u.username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                    u.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {u.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                    u.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {u.isActive ? '活跃' : '停用'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u._count?.generations || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedUser(u)
                      setShowPermissionsModal(true)
                    }}
                    className="text-green-600 hover:text-green-900 mr-3"
                  >
                    权限
                  </button>
                  <button
                    onClick={() => openEditModal(u)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    编辑
                  </button>
                  {u.id !== user?.id && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">添加新用户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input-field mt-1"
                  placeholder="输入用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">密码</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field mt-1"
                  placeholder="输入密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input-field mt-1"
                >
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={!formData.username || !formData.password}
                className="btn-primary"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">编辑用户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  disabled
                  className="input-field mt-1 bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">新密码（留空保持不变）</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field mt-1"
                  placeholder="输入新密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input-field mt-1"
                >
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedUser(null)
                  resetForm()
                }}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleEdit}
                className="btn-primary"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <UserPermissions
          userId={selectedUser.id}
          username={selectedUser.username}
          onClose={() => {
            setShowPermissionsModal(false)
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}

export default Users