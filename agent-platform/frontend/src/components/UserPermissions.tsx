import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { toast } from 'react-hot-toast';

interface UserPermissionsProps {
  userId: string;
  username: string;
  onClose: () => void;
}

interface Permission {
  id: string;
  name: string;
}

interface PermissionData {
  userId: string;
  username: string;
  role: string;
  assignedAgents: Permission[];
  assignedTasks: Permission[];
  availableAgents: Permission[];
  availableTasks: Permission[];
}

const UserPermissions: React.FC<UserPermissionsProps> = ({ userId, username, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Fetch user permissions
  const { data, isLoading, error } = useQuery<PermissionData>({
    queryKey: ['userPermissions', userId],
    queryFn: async () => {
      const response = await api.get(`/users/${userId}/permissions`);
      return response.data;
    },
    enabled: !!userId
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: { agentIds: string[]; taskIds: string[] }) => {
      return api.put(`/users/${userId}/permissions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPermissions', userId] });
      toast.success('权限已更新');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '更新权限失败');
    }
  });

  // Initialize selected items when data loads
  useEffect(() => {
    if (data) {
      setSelectedAgents(new Set(data.assignedAgents.map(a => a.id)));
      setSelectedTasks(new Set(data.assignedTasks.map(t => t.id)));
    }
  }, [data]);

  const handleAgentToggle = (agentId: string) => {
    const newSelected = new Set(selectedAgents);
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId);
    } else {
      newSelected.add(agentId);
    }
    setSelectedAgents(newSelected);
  };

  const handleTaskToggle = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAllAgents = () => {
    if (data) {
      setSelectedAgents(new Set(data.availableAgents.map(a => a.id)));
    }
  };

  const handleSelectNoneAgents = () => {
    setSelectedAgents(new Set());
  };

  const handleSelectAllTasks = () => {
    if (data) {
      setSelectedTasks(new Set(data.availableTasks.map(t => t.id)));
    }
  };

  const handleSelectNoneTasks = () => {
    setSelectedTasks(new Set());
  };

  const handleSave = () => {
    updatePermissionsMutation.mutate({
      agentIds: Array.from(selectedAgents),
      taskIds: Array.from(selectedTasks)
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-red-600">加载权限失败</p>
          <button onClick={onClose} className="mt-4 btn-secondary">
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">
            配置权限 - {username}
            {data.role === 'admin' && (
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                管理员
              </span>
            )}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {data.role === 'admin' ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800">
                <strong>注意：</strong>管理员账号默认拥有所有权限，无需配置。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Agents Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium">可用智能体</h3>
                  <div className="space-x-2">
                    <button
                      onClick={handleSelectAllAgents}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      全选
                    </button>
                    <button
                      onClick={handleSelectNoneAgents}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      清空
                    </button>
                  </div>
                </div>
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  {data.availableAgents.length === 0 ? (
                    <p className="text-gray-500">暂无可用智能体</p>
                  ) : (
                    <div className="space-y-2">
                      {data.availableAgents.map(agent => (
                        <label
                          key={agent.id}
                          className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAgents.has(agent.id)}
                            onChange={() => handleAgentToggle(agent.id)}
                            className="mr-3"
                          />
                          <span>{agent.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tasks Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium">可用任务模板</h3>
                  <div className="space-x-2">
                    <button
                      onClick={handleSelectAllTasks}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      全选
                    </button>
                    <button
                      onClick={handleSelectNoneTasks}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      清空
                    </button>
                  </div>
                </div>
                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  {data.availableTasks.length === 0 ? (
                    <p className="text-gray-500">暂无可用任务模板</p>
                  ) : (
                    <div className="space-y-2">
                      {data.availableTasks.map(task => (
                        <label
                          key={task.id}
                          className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(task.id)}
                            onChange={() => handleTaskToggle(task.id)}
                            className="mr-3"
                          />
                          <span>{task.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          {data.role !== 'admin' && (
            <button
              onClick={handleSave}
              disabled={updatePermissionsMutation.isPending}
              className="btn-primary"
            >
              {updatePermissionsMutation.isPending ? '保存中...' : '保存'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPermissions;