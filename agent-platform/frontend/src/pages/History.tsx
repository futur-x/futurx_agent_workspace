import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import ReactMarkdown from 'react-markdown'

const History = () => {
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [viewDetails, setViewDetails] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const response = await api.get('/history?limit=100')
      return response.data
    }
  })

  const { data: details } = useQuery({
    queryKey: ['history-detail', selectedItem?.id],
    queryFn: async () => {
      if (!selectedItem) return null
      const response = await api.get(`/history/${selectedItem.id}`)
      return response.data
    },
    enabled: !!selectedItem
  })

  const handleExport = async (id: string) => {
    try {
      const response = await api.get(`/history/${id}/export`, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `history-${id}.md`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (isLoading) {
    return <div>Loading history...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Generation History</h1>

      {viewDetails && details ? (
        <div>
          <button
            onClick={() => {
              setViewDetails(false)
              setSelectedItem(null)
            }}
            className="mb-4 text-blue-600 hover:text-blue-500"
          >
            ← Back to list
          </button>

          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-medium">{details.taskName}</h2>
                <p className="text-sm text-gray-500">by {details.agentName}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Generated: {new Date(details.createdAt).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">
                  Duration: {details.duration}s | Status: {details.status}
                </p>
              </div>
              <button
                onClick={() => handleExport(details.id)}
                className="btn-primary"
              >
                Export
              </button>
            </div>

            {details.input && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Input</h3>
                <div className="bg-gray-50 p-4 rounded">
                  {details.input.text && (
                    <div>
                      <p className="font-medium text-sm text-gray-700">Text Input:</p>
                      <p className="text-sm text-gray-600 mt-1">{details.input.text}</p>
                    </div>
                  )}
                  {details.input.fileName && (
                    <p className="text-sm text-gray-500 mt-2">
                      File: {details.input.fileName}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-medium mb-2">Generated Content</h3>
              <div className="bg-gray-50 p-6 rounded prose max-w-none">
                <ReactMarkdown>{details.fullContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.history && data.history.length > 0 ? (
            <>
              <p className="text-sm text-gray-500">
                Total: {data.total} generations
              </p>
              {data.history.map((item: any) => (
                <div
                  key={item.id}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedItem(item)
                    setViewDetails(true)
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium">{item.taskName}</h3>
                      <p className="text-sm text-gray-500">by {item.agentName}</p>
                      <p className="text-sm text-gray-600 mt-2">{item.summary}...</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        item.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="card text-center text-gray-500">
              No generation history yet. Start generating content to see it here.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default History