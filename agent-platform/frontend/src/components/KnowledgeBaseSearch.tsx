import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../utils/api'
import toast from 'react-hot-toast'

interface SearchResult {
  id: string
  text: string
  metadata: any
  score?: number
  hybridScore?: number
  vectorScore?: number
  keywordScore?: number
  distance?: number
}

interface KnowledgeBaseSearchProps {
  knowledgeBaseId: string
  knowledgeBaseName: string
}

const KnowledgeBaseSearch = ({ knowledgeBaseId, knowledgeBaseName }: KnowledgeBaseSearchProps) => {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'semantic' | 'hybrid'>('hybrid')
  const [similarity, setSimilarity] = useState(0.4)
  const [limit, setLimit] = useState(10)
  const [vectorWeight, setVectorWeight] = useState(0.7)
  const [results, setResults] = useState<SearchResult[] | null>(null)

  const searchMutation = useMutation({
    mutationFn: async (searchParams: any) => {
      const response = await api.post(`/knowledge-bases/${knowledgeBaseId}/search`, searchParams)
      return response.data
    },
    onSuccess: (data) => {
      setResults(data.results)
      if (data.results.length === 0) {
        toast.success('搜索完成，无匹配结果')
      } else {
        toast.success(`找到 ${data.results.length} 个结果`)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '搜索失败')
    }
  })

  const handleSearch = () => {
    if (!query.trim()) {
      toast.error('请输入搜索内容')
      return
    }

    const searchParams: any = {
      query: query.trim(),
      mode,
      similarity,
      limit
    }

    if (mode === 'hybrid') {
      searchParams.vectorWeight = vectorWeight
    }

    searchMutation.mutate(searchParams)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-medium mb-4">测试搜索</h3>
      <p className="text-sm text-gray-600 mb-4">知识库: {knowledgeBaseName}</p>

      {/* Search Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">搜索内容</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入要搜索的内容..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>

      {/* Search Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">搜索模式</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'semantic' | 'hybrid')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="semantic">语义搜索 (纯向量)</option>
            <option value="hybrid">混合搜索 (向量+关键词)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">返回结果数</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
            min="1"
            max="50"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            相似度阈值: {similarity.toFixed(2)}
          </label>
          <input
            type="range"
            value={similarity}
            onChange={(e) => setSimilarity(parseFloat(e.target.value))}
            min="0"
            max="1"
            step="0.05"
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.0 (宽松)</span>
            <span>1.0 (严格)</span>
          </div>
        </div>

        {mode === 'hybrid' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              向量权重: {vectorWeight.toFixed(2)}
            </label>
            <input
              type="range"
              value={vectorWeight}
              onChange={(e) => setVectorWeight(parseFloat(e.target.value))}
              min="0"
              max="1"
              step="0.1"
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.0 (仅关键词)</span>
              <span>1.0 (仅向量)</span>
            </div>
          </div>
        )}
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        disabled={searchMutation.isPending}
        className="w-full btn-primary"
      >
        {searchMutation.isPending ? '搜索中...' : '搜索'}
      </button>

      {/* Search Results */}
      {results !== null && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900">搜索结果</h4>
            <span className="text-sm text-gray-500">{results.length} 个结果</span>
          </div>

          {results.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className="border border-gray-200 rounded-md p-4 bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      #{index + 1}
                    </span>
                    <div className="flex space-x-2 text-xs">
                      {result.hybridScore !== undefined && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                          混合分数: {result.hybridScore.toFixed(3)}
                        </span>
                      )}
                      {result.score !== undefined && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          分数: {result.score.toFixed(3)}
                        </span>
                      )}
                      {result.vectorScore !== undefined && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          向量: {result.vectorScore.toFixed(3)}
                        </span>
                      )}
                      {result.keywordScore !== undefined && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                          关键词: {result.keywordScore.toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>

                  {result.metadata && (
                    <div className="text-xs text-gray-500 mb-2">
                      {result.metadata.fileName && <span>文件: {result.metadata.fileName}</span>}
                      {result.metadata.chunkIndex !== undefined && (
                        <span className="ml-3">Chunk: {result.metadata.chunkIndex}</span>
                      )}
                    </div>
                  )}

                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
                    {result.text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>未找到匹配结果</p>
              <p className="text-sm mt-1">尝试调整搜索参数或使用不同的搜索关键词</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default KnowledgeBaseSearch
