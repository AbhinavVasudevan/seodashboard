'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PlusIcon, DocumentTextIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { signOut } from 'next-auth/react'

interface Brand {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

interface Article {
  id: string
  slNo: string
  requestedBy: {
    name: string
    email: string
  }
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
  createdAt: string
}

export default function WriterArticlesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [brands, setBrands] = useState<Brand[]>([])
  const [requesters, setRequesters] = useState<User[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    slNo: '',
    requestedById: '',
    articleType: 'ARTICLE',
    brandId: '',
    topicTitle: '',
    gameProvider: '',
    primaryKeyword: '',
    finalWordCount: '',
    documentUrl: '',
    language: 'EN',
    sentDate: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (session.user.role !== 'WRITER') {
        router.push('/')
      } else {
        fetchData()
      }
    }
  }, [status, router, session])

  const fetchData = async () => {
    try {
      const [brandsRes, requestersRes, articlesRes] = await Promise.all([
        fetch('/api/brands'),
        fetch('/api/users?role=ADMIN,SEO'),
        fetch('/api/articles')
      ])

      if (brandsRes.ok) {
        const brandsData = await brandsRes.json()
        setBrands(brandsData)
      }

      if (requestersRes.ok) {
        const requestersData = await requestersRes.json()
        setRequesters(requestersData)
      }

      if (articlesRes.ok) {
        const articlesData = await articlesRes.json()
        setArticles(articlesData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      slNo: formData.slNo,
      requestedById: formData.requestedById,
      articleType: formData.articleType,
      brandId: formData.brandId,
      topicTitle: formData.topicTitle,
      gameProvider: formData.gameProvider || null,
      primaryKeyword: formData.primaryKeyword || null,
      finalWordCount: formData.finalWordCount ? parseInt(formData.finalWordCount) : null,
      documentUrl: formData.documentUrl || null,
      language: formData.language,
      sentDate: formData.sentDate,
    }

    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setShowForm(false)
        setFormData({
          slNo: '',
          requestedById: '',
          articleType: 'ARTICLE',
          brandId: '',
          topicTitle: '',
          gameProvider: '',
          primaryKeyword: '',
          finalWordCount: '',
          documentUrl: '',
          language: 'EN',
          sentDate: new Date().toISOString().split('T')[0],
        })
        fetchData()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create article')
      }
    } catch (error) {
      console.error('Error creating article:', error)
      alert('Failed to create article')
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">My Articles</h1>
                  <p className="text-gray-600 mt-1">Welcome, {session.user.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                {showForm ? 'Cancel' : 'Add Article'}
              </button>
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Article Form */}
        {showForm && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Article</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sl No */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sl No *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slNo}
                    onChange={(e) => setFormData({ ...formData, slNo: e.target.value })}
                    placeholder="e.g., HAJA-NOV-25-001"
                    className="input-field"
                  />
                </div>

                {/* Requested By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requested By *
                  </label>
                  <select
                    required
                    value={formData.requestedById}
                    onChange={(e) => setFormData({ ...formData, requestedById: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select requester</option>
                    {requesters.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Article Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type of Article *
                  </label>
                  <select
                    required
                    value={formData.articleType}
                    onChange={(e) => setFormData({ ...formData, articleType: e.target.value })}
                    className="input-field"
                  >
                    <option value="ARTICLE">Article</option>
                    <option value="CATEGORY">Category</option>
                    <option value="APP_REVIEW">App Review</option>
                    <option value="GAME_REVIEW">Game Review</option>
                    <option value="GUEST_POST">Guest Post</option>
                    <option value="BRAND_REVIEW">Brand Review</option>
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand *
                  </label>
                  <select
                    required
                    value={formData.brandId}
                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic/Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic/Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.topicTitle}
                    onChange={(e) => setFormData({ ...formData, topicTitle: e.target.value })}
                    placeholder="e.g., Top 15 iGaming Affiliate Softwares"
                    className="input-field"
                  />
                </div>

                {/* Game Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Game Provider (If any)
                  </label>
                  <input
                    type="text"
                    value={formData.gameProvider}
                    onChange={(e) => setFormData({ ...formData, gameProvider: e.target.value })}
                    placeholder="e.g., Evolution Gaming"
                    className="input-field"
                  />
                </div>

                {/* Primary Keyword */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Keyword
                  </label>
                  <input
                    type="text"
                    value={formData.primaryKeyword}
                    onChange={(e) => setFormData({ ...formData, primaryKeyword: e.target.value })}
                    placeholder="e.g., iGaming software"
                    className="input-field"
                  />
                </div>

                {/* Final Word Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Final Word Count
                  </label>
                  <input
                    type="number"
                    value={formData.finalWordCount}
                    onChange={(e) => setFormData({ ...formData, finalWordCount: e.target.value })}
                    placeholder="e.g., 3124"
                    className="input-field"
                  />
                </div>

                {/* Document URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location of Article Document
                  </label>
                  <input
                    type="url"
                    value={formData.documentUrl}
                    onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
                    placeholder="https://docs.google.com/document/..."
                    className="input-field"
                  />
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language *
                  </label>
                  <select
                    required
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="input-field"
                  >
                    <option value="EN">English</option>
                    <option value="ES">Spanish</option>
                    <option value="HI">Hindi</option>
                    <option value="DE">German</option>
                    <option value="FI">Finnish</option>
                    <option value="DA">Dansk (Danish)</option>
                    <option value="SV">Swedish</option>
                    <option value="GA">Irish</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.sentDate}
                    onChange={(e) => setFormData({ ...formData, sentDate: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Article
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Articles Table */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">All Articles</h2>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      No articles found. Add your first article!
                    </td>
                  </tr>
                ) : (
                  articles.map((article) => (
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
                          {article.status}
                        </span>
                        {article.status === 'REJECTED' && article.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1">
                            Reason: {article.rejectionReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-yellow-100 text-yellow-800'
    case 'REJECTED':
      return 'bg-red-100 text-red-800'
    case 'ACCEPTED':
      return 'bg-blue-100 text-blue-800'
    case 'UNPUBLISHED':
      return 'bg-purple-100 text-purple-800'
    case 'SENT_TO_DEV':
      return 'bg-indigo-100 text-indigo-800'
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
