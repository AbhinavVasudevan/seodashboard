'use client'

import { useState, useEffect } from 'react'
import { TrashIcon, MagnifyingGlassIcon, PencilIcon } from '@heroicons/react/24/outline'
import ArticleDetailModal from '@/components/ArticleDetailModal'

interface Article {
  id: string
  slNo: string
  requestedBy: {
    name: string
    email: string
  }
  writtenBy?: {
    name: string
    email: string
  } | null
  articleType: string
  brand: {
    name: string
  }
  topicTitle: string
  gameProvider: string | null
  primaryKeyword: string | null
  finalWordCount: number | null
  documentUrl: string | null
  status: string
  rejectionReason: string | null
  url: string | null
  createdAt: string

  // SEO fields
  pageName: string | null
  language: string | null
  pageType: string | null
  contentUrl: string | null
  originalWc: number | null
  writer: string | null
  sentDate: string | null
  publishDate: string | null
  seoCheck: boolean
  images: number | null
  aiScore: number | null
  plagiarismScore: number | null
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles')
      const data = await response.json()
      console.log('Fetched articles:', data)
      console.log('First article status:', data[0]?.status)
      setArticles(data)
    } catch (error) {
      console.error('Error fetching articles:', error)
    }
  }


  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      try {
        await fetch(`/api/articles?id=${id}`, {
          method: 'DELETE',
        })
        fetchArticles()
      } catch (error) {
        console.error('Error deleting article:', error)
      }
    }
  }


  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.topicTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.slNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.requestedBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.brand.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || article.status === statusFilter
    return matchesSearch && matchesStatus
  })


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Articles</h1>
          <p className="text-gray-600 mt-2">View all articles across all brands</p>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Pending Review</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="SENT_TO_DEV">Sent to Dev</option>
            <option value="LIVE">Live</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Articles Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sl No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Topic/Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Game Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Word Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredArticles.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      No articles found
                    </td>
                  </tr>
                ) : (
                  filteredArticles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {article.slNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.requestedBy.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {article.articleType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.brand.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {article.topicTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {article.gameProvider || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.finalWordCount || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {article.documentUrl ? (
                          <a
                            href={article.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View Doc
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(article.status)}`}>
                          {formatStatus(article.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedArticle(article)
                              setShowDetailModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit article"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete article"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Article Detail/Edit Modal */}
        {showDetailModal && selectedArticle && (
          <ArticleDetailModal
            article={selectedArticle}
            onClose={() => {
              setShowDetailModal(false)
              setSelectedArticle(null)
            }}
            onSave={() => {
              setShowDetailModal(false)
              setSelectedArticle(null)
              fetchArticles()
            }}
          />
        )}
      </div>
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-yellow-100 text-yellow-800'
    case 'REJECTED':
      return 'bg-red-100 text-red-800'
    case 'ACCEPTED':
      return 'bg-cyan-100 text-cyan-800'
    case 'SENT_TO_DEV':
      return 'bg-blue-100 text-blue-800'
    case 'LIVE':
      return 'bg-green-100 text-green-800'
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function formatStatus(status: string) {
  switch (status) {
    case 'SUBMITTED':
      return 'Pending Review'
    case 'SENT_TO_DEV':
      return 'Sent to Dev'
    default:
      return status.replace('_', ' ')
  }
}
