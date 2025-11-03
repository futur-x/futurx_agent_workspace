import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'
import toast from 'react-hot-toast'

interface Chunk {
  id: string
  text: string
  metadata: any
}

interface DocumentChunksModalProps {
  documentId: string
  documentName: string
  onClose: () => void
}

const DocumentChunksModal = ({ documentId, documentName, onClose }: DocumentChunksModalProps) => {
  const queryClient = useQueryClient()
  const [editingChunkId, setEditingChunkId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  const { data: chunksData, isLoading } = useQuery({
    queryKey: ['documentChunks', documentId],
    queryFn: async () => {
      const response = await api.get(`/documents/${documentId}/chunks`)
      // Sort chunks by chunkIndex to maintain original order
      const chunks = response.data.chunks || []
      return chunks.sort((a: Chunk, b: Chunk) => {
        const indexA = a.metadata?.chunkIndex ?? 0
        const indexB = b.metadata?.chunkIndex ?? 0
        return indexA - indexB
      })
    }
  })

  const updateChunkMutation = useMutation({
    mutationFn: async ({ chunkId, text }: { chunkId: string; text: string }) => {
      return api.put(`/documents/${documentId}/chunks/${chunkId}`, { text })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentChunks', documentId] })
      setEditingChunkId(null)
      setEditingText('')
      toast.success('Chunk更新成功，已重新生成embedding')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Chunk更新失败')
    }
  })

  const handleEdit = (chunk: Chunk) => {
    setEditingChunkId(chunk.id)
    setEditingText(chunk.text)
  }

  const handleSave = (chunkId: string) => {
    if (!editingText.trim()) {
      toast.error('Chunk内容不能为空')
      return
    }
    updateChunkMutation.mutate({ chunkId, text: editingText })
  }

  const handleCancel = () => {
    setEditingChunkId(null)
    setEditingText('')
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white mb-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">文档分块详情</h3>
            <p className="text-sm text-gray-600 mt-1">文档: {documentName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-gray-500 text-center py-8">加载中...</p>
          ) : chunksData && chunksData.length > 0 ? (
            chunksData.map((chunk: Chunk, index: number) => (
              <div
                key={chunk.id}
                className="border border-gray-200 rounded-md p-4 bg-white hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Chunk #{index + 1}
                    </span>
                    {chunk.metadata?.fileName && (
                      <span className="text-xs text-gray-500">
                        {chunk.metadata.fileName}
                      </span>
                    )}
                  </div>
                  {editingChunkId === chunk.id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSave(chunk.id)}
                        disabled={updateChunkMutation.isPending}
                        className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        {updateChunkMutation.isPending ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(chunk)}
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      编辑
                    </button>
                  )}
                </div>

                {chunk.metadata && (
                  <div className="text-xs text-gray-500 mb-2 space-x-3">
                    {chunk.metadata.chunkIndex !== undefined && (
                      <span>索引: {chunk.metadata.chunkIndex}</span>
                    )}
                    {chunk.metadata.startChar !== undefined && (
                      <span>起始位置: {chunk.metadata.startChar}</span>
                    )}
                    {chunk.metadata.endChar !== undefined && (
                      <span>结束位置: {chunk.metadata.endChar}</span>
                    )}
                  </div>
                )}

                {editingChunkId === chunk.id ? (
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={10}
                  />
                ) : (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                    {chunk.text}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>暂无分块数据</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default DocumentChunksModal
