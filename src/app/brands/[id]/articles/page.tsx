'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DocumentTextIcon, PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface Article {
  id: string
  pageName: string
  language: string
  url?: string
  pageType: string
  contentUrl?: string
  wordCount?: number
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'LIVE' | 'REJECTED'
  docCode?: string
  originalWc?: number
  writer?: string
  publishDate?: string
  seoCheck: boolean
  images?: number
  ai: boolean
  plagiarism: boolean
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [formData, setFormData] = useState({
    pageName: '',
    language: 'English',
    url: '',
    pageType: 'Category',
    contentUrl: '',
    wordCount: '',
    status: 'DRAFT',
    docCode: '',
    originalWc: '',
    writer: '',
    publishDate: '',
    seoCheck: false,
    images: '',
    ai: false,
    plagiarism: false,
  })

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
      const response = await fetch(`/api/articles?brandId=${brandId}`)
      const data = await response.json()
      setArticles(data)
    } catch (error) {
      console.error('Error fetching articles:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        wordCount: formData.wordCount ? parseInt(formData.wordCount) : null,
        originalWc: formData.originalWc ? parseInt(formData.originalWc) : null,
        images: formData.images ? parseInt(formData.images) : null,
        publishDate: formData.publishDate || null,
        brandId,
      }

      const response = await fetch('/api/articles', {
        method: editingArticle ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingArticle ? { ...payload, id: editingArticle.id } : payload),
      })

      if (response.ok) {
        setShowAddForm(false)
        setEditingArticle(null)
        resetForm()
        fetchArticles()
      }
    } catch (error) {
      console.error('Error saving article:', error)
    }
  }

  const handleEdit = (article: Article) => {
    setEditingArticle(article)
    setFormData({
      pageName: article.pageName,
      language: article.language,
      url: article.url || '',
      pageType: article.pageType,
      contentUrl: article.contentUrl || '',
      wordCount: article.wordCount?.toString() || '',
      status: article.status,
      docCode: article.docCode || '',
      originalWc: article.originalWc?.toString() || '',
      writer: article.writer || '',
      publishDate: article.publishDate ? new Date(article.publishDate).toISOString().split('T')[0] : '',
      seoCheck: article.seoCheck,
      images: article.images?.toString() || '',
      ai: article.ai,
      plagiarism: article.plagiarism,
    })
    setShowAddForm(true)
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

  const resetForm = () => {
    setFormData({
      pageName: '',
      language: 'English',
      url: '',
      pageType: 'Category',
      contentUrl: '',
      wordCount: '',
      status: 'DRAFT',
      docCode: '',
      originalWc: '',
      writer: '',
      publishDate: '',
      seoCheck: false,
      images: '',
      ai: false,
      plagiarism: false,
    })
  }

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.pageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.writer?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || article.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE':
      case 'PUBLISHED':
        return 'status-success'
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING_REVIEW':
        return 'status-warning'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'REJECTED':
        return 'status-error'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const exportToCSV = () => {
    const headers = ['Page Name', 'Language', 'URL', 'Page Type', 'Content URL', 'Word Count', 'Status', 'Doc Code', 'Original WC', 'Writer', 'Publish Date', 'SEO Check', 'Images', 'AI', 'Plagiarism']

    const rows = filteredArticles.map(article => [
      article.pageName,
      article.language,
      article.url || '',
      article.pageType,
      article.contentUrl || '',
      article.wordCount || '',
      article.status,
      article.docCode || '',
      article.originalWc || '',
      article.writer || '',
      article.publishDate ? new Date(article.publishDate).toLocaleDateString() : '',
      article.seoCheck ? 'Done' : '',
      article.images || '',
      article.ai ? 'Yes' : 'No',
      article.plagiarism ? 'Yes' : 'No',
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

  const pageTypes = ['Category', 'Guide', 'Review', 'News', 'Blog', 'Landing Page']
  const languages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese']

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
                <p className="text-gray-600 mt-1">Track and manage content production</p>
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
              <button
                onClick={() => {
                  setShowAddForm(true)
                  setEditingArticle(null)
                  resetForm()
                }}
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Add Article
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Total Articles</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{articles.length}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Live</div>
            <div className="text-2xl font-semibold text-green-600 mt-1">
              {articles.filter(a => a.status === 'LIVE' || a.status === 'PUBLISHED').length}
            </div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">In Progress</div>
            <div className="text-2xl font-semibold text-yellow-600 mt-1">
              {articles.filter(a => a.status === 'DRAFT' || a.status === 'PENDING_REVIEW').length}
            </div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Total Words</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">
              {articles.reduce((sum, a) => sum + (a.wordCount || 0), 0).toLocaleString()}
            </div>
          </div>
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
            <option value="DRAFT">Draft</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="LIVE">Live</option>
            <option value="PUBLISHED">Published</option>
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
                    Page Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Language
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Writer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Word Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Checks
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Publish Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredArticles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      No articles found. Click "Add Article" to create your first article.
                    </td>
                  </tr>
                ) : (
                  filteredArticles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                          <div className="text-sm font-medium text-gray-900">{article.pageName}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.language}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.pageType}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.writer || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.wordCount ? article.wordCount.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`status-badge ${getStatusColor(article.status)}`}>
                          {article.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          {article.seoCheck && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800" title="SEO Check Done">
                              ✓ SEO
                            </span>
                          )}
                          {article.ai && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800" title="AI Content">
                              AI {article.ai}%
                            </span>
                          )}
                          {article.plagiarism && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800" title="Plagiarism Detected">
                              ⚠ {article.plagiarism}%
                            </span>
                          )}
                          {article.images && article.images > 0 && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800" title="Images">
                              🖼 {article.images}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {article.publishDate
                          ? new Date(article.publishDate).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {article.url && (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-800"
                              title="View Page"
                            >
                              View
                            </a>
                          )}
                          {article.contentUrl && (
                            <a
                              href={article.contentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800"
                              title="View Content Doc"
                            >
                              Doc
                            </a>
                          )}
                          <button
                            onClick={() => handleEdit(article)}
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

        {/* Add/Edit Article Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {editingArticle ? 'Edit Article' : 'Add New Article'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Name *
                    </label>
                    <input
                      type="text"
                      value={formData.pageName}
                      onChange={(e) => setFormData({ ...formData, pageName: e.target.value })}
                      className="input-field"
                      required
                      placeholder="e.g., Betting"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language *
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="input-field"
                      required
                    >
                      {languages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Type *
                    </label>
                    <select
                      value={formData.pageType}
                      onChange={(e) => setFormData({ ...formData, pageType: e.target.value })}
                      className="input-field"
                      required
                    >
                      {pageTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Live URL
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="input-field"
                      placeholder="https://www.example.com/page"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content URL (Google Doc)
                    </label>
                    <input
                      type="url"
                      value={formData.contentUrl}
                      onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
                      className="input-field"
                      placeholder="https://docs.google.com/document/..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Word Count
                    </label>
                    <input
                      type="number"
                      value={formData.wordCount}
                      onChange={(e) => setFormData({ ...formData, wordCount: e.target.value })}
                      className="input-field"
                      min="0"
                      placeholder="2047"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Original Word Count
                    </label>
                    <input
                      type="number"
                      value={formData.originalWc}
                      onChange={(e) => setFormData({ ...formData, originalWc: e.target.value })}
                      className="input-field"
                      min="0"
                      placeholder="2496"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Writer
                    </label>
                    <input
                      type="text"
                      value={formData.writer}
                      onChange={(e) => setFormData({ ...formData, writer: e.target.value })}
                      className="input-field"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="input-field"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING_REVIEW">Pending Review</option>
                      <option value="APPROVED">Approved</option>
                      <option value="LIVE">Live</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Publish Date
                    </label>
                    <input
                      type="date"
                      value={formData.publishDate}
                      onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Doc Code
                    </label>
                    <input
                      type="text"
                      value={formData.docCode}
                      onChange={(e) => setFormData({ ...formData, docCode: e.target.value })}
                      className="input-field"
                      placeholder="ATAM-FEB-24-018"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Images
                    </label>
                    <input
                      type="number"
                      value={formData.images}
                      onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                      className="input-field"
                      min="0"
                      placeholder="3"
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="seoCheck"
                        checked={formData.seoCheck}
                        onChange={(e) => setFormData({ ...formData, seoCheck: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="seoCheck" className="ml-2 block text-sm text-gray-900">
                        SEO Check Done
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="ai"
                        checked={formData.ai}
                        onChange={(e) => setFormData({ ...formData, ai: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="ai" className="ml-2 block text-sm text-gray-900">
                        AI Content Detected
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="plagiarism"
                        checked={formData.plagiarism}
                        onChange={(e) => setFormData({ ...formData, plagiarism: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="plagiarism" className="ml-2 block text-sm text-gray-900">
                        Plagiarism Detected
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingArticle(null)
                      resetForm()
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    {editingArticle ? 'Update' : 'Add'} Article
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
