import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import { Link } from 'react-router-dom'

const Dashboard = () => {
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

  const { data: history } = useQuery({
    queryKey: ['history-recent'],
    queryFn: async () => {
      const response = await api.get('/history?limit=5')
      return response.data.history
    }
  })

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">仪表板</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Agents Card */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-2">智能体</h2>
          <p className="text-3xl font-semibold text-blue-600">{agents?.length || 0}</p>
          <p className="text-sm text-gray-500 mt-1">已配置的智能体</p>
          <Link to="/agents" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-500">
            管理智能体 →
          </Link>
        </div>

        {/* Tasks Card */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-2">任务</h2>
          <p className="text-3xl font-semibold text-green-600">{tasks?.length || 0}</p>
          <p className="text-sm text-gray-500 mt-1">任务模板</p>
          <Link to="/tasks" className="mt-4 inline-block text-sm text-green-600 hover:text-green-500">
            管理任务 →
          </Link>
        </div>

        {/* Quick Generate Card */}
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 mb-2">快速生成</h2>
          <p className="text-sm text-gray-500 mb-4">立即开始生成内容</p>
          <Link to="/generate" className="btn-primary inline-block">
            生成内容
          </Link>
        </div>
      </div>

      {/* Recent History */}
      <div className="mt-8">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">最近生成</h2>
            <Link to="/history" className="text-sm text-blue-600 hover:text-blue-500">
              查看全部 →
            </Link>
          </div>

          {history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((item: any) => (
                <div key={item.id} className="border-l-4 border-gray-200 pl-4 py-2">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.taskName}</p>
                      <p className="text-sm text-gray-500">由 {item.agentName} 生成</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{item.summary}...</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">暂无生成记录</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard