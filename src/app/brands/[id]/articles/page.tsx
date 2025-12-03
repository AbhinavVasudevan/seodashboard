'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DocumentTextIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, ArrowLeftIcon, ArrowDownTrayIcon, EyeIcon } from '@heroicons/react/24/outline'
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
  pageName: string | null
  language: string | null
  url: string | null
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

interface Brand {
  id: string
  name: string
  description?: string
}

export default function BrandArticlesPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.id as string

  const [brand, setBrand] = useState<Brand | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBrandData()
    fetchArticles()
  }, [brandId])

  const fetchBrandData = async () => {
    try {
      const response = await fetch('/api/brands')
      if (!response.ok) throw new Error('Failed to fetch brands')

      const brands = await response.json()
      const currentBrand = brands.find((b: Brand) => b.id === brandId)

      if (currentBrand) {
        setBrand(currentBrand)
      }
    } catch (error) {
      console.error('Error fetching brand:', error)
    }
  }

  const fetchArticles = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/articles?brandId=${brandId}`)
      const data = await response.json()
      setArticles(data)
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setIsLoading(false)
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
    const matchesSearch =
      article.topicTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.slNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.writer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.requestedBy.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || article.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE':
        return 'bg-green-100 text-green-800'
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800'
      case 'SENT_TO_DEV':
        return 'bg-blue-100 text-blue-800'
      case 'ACCEPTED':
        return 'bg-cyan-100 text-cyan-800'
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const exportToCSV = () => {
    const headers = ['Sl No', 'Topic/Title', 'Writer', 'Article Type', 'Status', 'AI Score', 'Plagiarism Score', 'Word Count', 'URL', 'Publish Date']

    const rows = filteredArticles.map(article => [
      article.slNo,
      article.topicTitle,
      article.writer || article.writtenBy?.name || '',
      article.articleType,
      article.status,
      article.aiScore ?? '',
      article.plagiarismScore ?? '',
      article.finalWordCount || article.originalWc || '',
      article.url || '',
      article.publishDate ? new Date(article.publishDate).toLocaleDateString() : '',
    ])

    const csvContent = [
      headers.join('\t'),
      ...rows.map(row => row.join('\t'))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/tab-separated-values' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${brand?.name || 'articles'}-articles-${new Date().toISOString().split('T')[0]}.tsv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Count articles by status
  const statusCounts = {
    total: articles.length,
    submitted: articles.filter(a => a.status === 'SUBMITTED').length,
    accepted: articles.filter(a => a.status === 'ACCEPTED').length,
    sentToDev: articles.filter(a => a.status === 'SENT_TO_DEV').length,
    live: articles.filter(a => a.status === 'LIVE' || a.status === 'PUBLISHED').length,
    rejected: articles.filter(a => a.status === 'REJECTED').length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/brands/${brandId}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Articles - {brand?.name}</h1>
                <p className="text-gray-600 mt-1">Manage content workflow and track article status</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportToCSV}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Total</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{statusCounts.total}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Pending Review</div>
            <div className="text-2xl font-semibold text-yellow-600 mt-1">{statusCounts.submitted}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Accepted</div>
            <div className="text-2xl font-semibold text-cyan-600 mt-1">{statusCounts.accepted}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Sent to Dev</div>
            <div className="text-2xl font-semibold text-blue-600 mt-1">{statusCounts.sentToDev}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Live</div>
            <div className="text-2xl font-semibold text-green-600 mt-1">{statusCounts.live}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Rejected</div>
            <div className="text-2xl font-semibold text-red-600 mt-1">{statusCounts.rejected}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, Sl No, writer..."
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sl No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Topic/Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Writer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Words
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scores
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Links
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Loading articles...
                    </td>
                  </tr>
                ) : filteredArticles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No articles found for this brand.
                    </td>
                  </tr>
                ) : (
                  filteredArticles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {article.slNo}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-start">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={article.topicTitle}>
                              {article.topicTitle}
                            </div>
                            {article.primaryKeyword && (
                              <div className="text-xs text-gray-500">
                                {article.primaryKeyword}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.writer || article.writtenBy?.name || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.finalWordCount || article.originalWc || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {article.aiScore !== null && (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                              article.aiScore > 20 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              AI: {article.aiScore}%
                            </span>
                          )}
                          {article.plagiarismScore !== null && (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                              article.plagiarismScore > 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              Plag: {article.plagiarismScore}%
                            </span>
                          )}
                          {article.aiScore === null && article.plagiarismScore === null && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`status-badge ${getStatusColor(article.status)}`}>
                          {article.status === 'SENT_TO_DEV' ? 'Sent to Dev' : article.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-1">
                          {article.url && (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 font-medium"
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                              View Live
                            </a>
                          )}
                          {article.contentUrl && (
                            <a
                              href={article.contentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              <DocumentTextIcon className="h-3.5 w-3.5" />
                              Final Doc
                            </a>
                          )}
                          {article.documentUrl && !article.contentUrl && (
                            <a
                              href={article.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800"
                            >
                              <DocumentTextIcon className="h-3.5 w-3.5" />
                              Draft Doc
                            </a>
                          )}
                          {!article.url && !article.contentUrl && !article.documentUrl && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedArticle(article)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
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
      </main>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <ArticleDetailModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onSave={() => {
            setSelectedArticle(null)
            fetchArticles()
          }}
        />
      )}
    </div>
  )
}
