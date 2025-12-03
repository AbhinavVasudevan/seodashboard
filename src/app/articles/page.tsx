'use client'

import { useState, useEffect } from 'react'
import { TrashIcon, MagnifyingGlassIcon, PencilIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/articles')
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
    const matchesSearch = article.topicTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.slNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.requestedBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.brand.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || article.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'badge-warning'
      case 'REJECTED': return 'badge-destructive'
      case 'ACCEPTED': return 'badge-info'
      case 'SENT_TO_DEV': return 'badge-primary'
      case 'LIVE':
      case 'PUBLISHED': return 'badge-success'
      default: return 'badge-default'
    }
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'Pending Review'
      case 'SENT_TO_DEV': return 'Sent to Dev'
      default: return status.replace('_', ' ')
    }
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="page-title">All Articles</h1>
              <p className="text-sm text-muted-foreground">View all articles across all brands</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-auto min-w-[160px]"
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
        <div className="table-container">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner-md text-primary"></div>
            </div>
          ) : (
            <div className="table-wrapper scrollbar-thin">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sl No</th>
                    <th>Requested By</th>
                    <th>Type</th>
                    <th>Brand</th>
                    <th>Topic/Title</th>
                    <th>Game Provider</th>
                    <th>Word Count</th>
                    <th>Document</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArticles.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <div className="empty-state">
                          <DocumentTextIcon className="empty-state-icon" />
                          <p className="empty-state-title">No articles found</p>
                          <p className="empty-state-description">
                            {searchTerm || statusFilter ? 'Try adjusting your filters' : 'No articles have been created yet'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredArticles.map((article) => (
                      <tr key={article.id}>
                        <td className="cell-primary whitespace-nowrap">
                          {article.slNo}
                        </td>
                        <td className="whitespace-nowrap">
                          {article.requestedBy.name}
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="badge-info">
                            {article.articleType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          {article.brand.name}
                        </td>
                        <td className="max-w-[250px]">
                          <span className="line-clamp-2">{article.topicTitle}</span>
                        </td>
                        <td className="cell-secondary whitespace-nowrap">
                          {article.gameProvider || '-'}
                        </td>
                        <td className="whitespace-nowrap">
                          {article.finalWordCount || '-'}
                        </td>
                        <td className="whitespace-nowrap">
                          {article.documentUrl ? (
                            <a
                              href={article.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link"
                            >
                              View Doc
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap">
                          <span className={getStatusBadge(article.status)}>
                            {formatStatus(article.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedArticle(article)
                                setShowDetailModal(true)
                              }}
                              className="action-btn"
                              title="Edit article"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(article.id)}
                              className="action-btn-danger"
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
          )}
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
