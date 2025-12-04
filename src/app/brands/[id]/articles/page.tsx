'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'
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
  domain?: string | null
}

export default function BrandArticlesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const brandId = resolvedParams.id

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
      const response = await fetch(`/api/brands/${brandId}`)
      if (response.ok) {
        const data = await response.json()
        setBrand(data)
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
      toast.error('Failed to fetch articles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      try {
        const response = await fetch(`/api/articles?id=${id}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          toast.success('Article deleted')
          fetchArticles()
        } else {
          toast.error('Failed to delete article')
        }
      } catch (error) {
        console.error('Error deleting article:', error)
        toast.error('Failed to delete article')
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIVE':
        return 'badge-success'
      case 'PUBLISHED':
        return 'badge-success'
      case 'SENT_TO_DEV':
        return 'badge-info'
      case 'ACCEPTED':
        return 'badge-info'
      case 'SUBMITTED':
        return 'badge-warning'
      case 'REJECTED':
        return 'badge-destructive'
      case 'UNPUBLISHED':
        return 'badge-secondary'
      default:
        return 'badge-secondary'
    }
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case 'SENT_TO_DEV':
        return 'Sent to Dev'
      case 'LIVE':
        return 'Live'
      case 'PUBLISHED':
        return 'Published'
      case 'ACCEPTED':
        return 'Accepted'
      case 'SUBMITTED':
        return 'Pending'
      case 'REJECTED':
        return 'Rejected'
      case 'UNPUBLISHED':
        return 'Unpublished'
      default:
        return status
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
    toast.success('Articles exported successfully')
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

  // Calculate total word count
  const totalWords = articles.reduce((sum, a) => sum + (a.finalWordCount || a.originalWc || 0), 0)

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="flex items-center gap-4">
            <Link href={`/brands/${brandId}`} className="action-btn">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="page-title">Articles {brand?.name ? `- ${brand.name}` : ''}</h1>
                <p className="text-sm text-muted-foreground">Manage content workflow and track article status</p>
              </div>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            className="btn-secondary"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="stat-card">
            <div className="stat-value text-foreground">{statusCounts.total}</div>
            <div className="stat-label">Total Articles</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-blue-600 dark:text-blue-400">{totalWords.toLocaleString()}</div>
            <div className="stat-label">Total Words</div>
          </div>
          <button
            onClick={() => setStatusFilter(statusFilter === 'SUBMITTED' ? '' : 'SUBMITTED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'SUBMITTED' ? 'ring-2 ring-yellow-500' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-value text-yellow-600 dark:text-yellow-400">{statusCounts.submitted}</div>
                <div className="stat-label">Pending</div>
              </div>
              <ClockIcon className={`h-5 w-5 text-yellow-400 ${statusFilter === 'SUBMITTED' ? 'opacity-100' : 'opacity-50'}`} />
            </div>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'ACCEPTED' ? '' : 'ACCEPTED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'ACCEPTED' ? 'ring-2 ring-cyan-500' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-value text-cyan-600 dark:text-cyan-400">{statusCounts.accepted}</div>
                <div className="stat-label">Accepted</div>
              </div>
              <DocumentCheckIcon className={`h-5 w-5 text-cyan-400 ${statusFilter === 'ACCEPTED' ? 'opacity-100' : 'opacity-50'}`} />
            </div>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'SENT_TO_DEV' ? '' : 'SENT_TO_DEV')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'SENT_TO_DEV' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-value text-blue-600 dark:text-blue-400">{statusCounts.sentToDev}</div>
                <div className="stat-label">Sent to Dev</div>
              </div>
              <PaperAirplaneIcon className={`h-5 w-5 text-blue-400 ${statusFilter === 'SENT_TO_DEV' ? 'opacity-100' : 'opacity-50'}`} />
            </div>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'LIVE' ? '' : 'LIVE')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'LIVE' ? 'ring-2 ring-green-500' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-value text-green-600 dark:text-green-400">{statusCounts.live}</div>
                <div className="stat-label">Live</div>
              </div>
              <CheckCircleIcon className={`h-5 w-5 text-green-400 ${statusFilter === 'LIVE' ? 'opacity-100' : 'opacity-50'}`} />
            </div>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? '' : 'REJECTED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'REJECTED' ? 'ring-2 ring-red-500' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-value text-red-600 dark:text-red-400">{statusCounts.rejected}</div>
                <div className="stat-label">Rejected</div>
              </div>
              <XCircleIcon className={`h-5 w-5 text-red-400 ${statusFilter === 'REJECTED' ? 'opacity-100' : 'opacity-50'}`} />
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by title, Sl No, writer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="SENT_TO_DEV">Sent to Dev</option>
            <option value="LIVE">Live</option>
            <option value="PUBLISHED">Published</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Status Filter Banner */}
        {statusFilter && (
          <div className="mb-4 p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-primary">
              Showing {formatStatus(statusFilter)} articles ({filteredArticles.length})
            </span>
            <button
              onClick={() => setStatusFilter('')}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <XCircleIcon className="h-3.5 w-3.5" />
              Clear filter
            </button>
          </div>
        )}

        {/* Articles Table */}
        <div className="table-container">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner-md text-primary"></div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="empty-state">
              <DocumentTextIcon className="empty-state-icon" />
              <p className="empty-state-title">No articles found</p>
              <p className="empty-state-description">
                {searchTerm || statusFilter ? 'Try adjusting your filters' : 'No articles for this brand yet'}
              </p>
            </div>
          ) : (
            <div className="table-wrapper scrollbar-thin">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sl No</th>
                    <th>Topic / Title</th>
                    <th>Writer</th>
                    <th>Words</th>
                    <th>Scores</th>
                    <th>Status</th>
                    <th>Links</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.map((article) => (
                    <tr key={article.id}>
                      <td className="cell-primary whitespace-nowrap font-mono text-xs">
                        {article.slNo}
                      </td>
                      <td className="max-w-xs">
                        <div className="flex items-start gap-2">
                          <DocumentTextIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="cell-primary truncate" title={article.topicTitle}>
                              {article.topicTitle}
                            </div>
                            {article.primaryKeyword && (
                              <div className="text-xs text-muted-foreground truncate">
                                {article.primaryKeyword}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="cell-secondary whitespace-nowrap">
                        {article.writer || article.writtenBy?.name || '-'}
                      </td>
                      <td className="cell-secondary whitespace-nowrap">
                        {(article.finalWordCount || article.originalWc)?.toLocaleString() || '-'}
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {article.aiScore !== null && (
                            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              article.aiScore > 20 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            }`}>
                              AI: {article.aiScore}%
                            </span>
                          )}
                          {article.plagiarismScore !== null && (
                            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              article.plagiarismScore > 10 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            }`}>
                              Plag: {article.plagiarismScore}%
                            </span>
                          )}
                          {article.aiScore === null && article.plagiarismScore === null && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={getStatusBadge(article.status)}>
                          {formatStatus(article.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {article.url && (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline font-medium"
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                              Live
                            </a>
                          )}
                          {article.contentUrl && (
                            <a
                              href={article.contentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <DocumentTextIcon className="h-3.5 w-3.5" />
                              Doc
                            </a>
                          )}
                          {article.documentUrl && !article.contentUrl && (
                            <a
                              href={article.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                            >
                              <DocumentTextIcon className="h-3.5 w-3.5" />
                              Draft
                            </a>
                          )}
                          {!article.url && !article.contentUrl && !article.documentUrl && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedArticle(article)}
                            className="action-btn"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="action-btn-danger"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results count */}
        {!isLoading && filteredArticles.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Showing {filteredArticles.length} of {articles.length} articles
          </div>
        )}
      </div>

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
