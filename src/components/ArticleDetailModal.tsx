'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

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

  // SEO fields
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

interface ArticleDetailModalProps {
  article: Article
  onClose: () => void
  onSave: () => void
}

export default function ArticleDetailModal({ article, onClose, onSave }: ArticleDetailModalProps) {
  console.log('ArticleDetailModal received article:', article)
  console.log('Article status:', article.status)

  const [formData, setFormData] = useState({
    status: article.status,
    rejectionReason: article.rejectionReason || '',
    pageName: article.pageName || article.topicTitle || '', // Default to topic title
    language: article.language || 'EN',
    url: article.url || '',
    pageType: article.pageType || article.articleType, // Default to article type
    contentUrl: article.contentUrl || '',
    originalWc: article.originalWc || article.finalWordCount || '',
    writer: article.writer || '',
    sentDate: article.sentDate ? article.sentDate.split('T')[0] : new Date().toISOString().split('T')[0], // Default to today
    publishDate: article.publishDate ? article.publishDate.split('T')[0] : '',
    seoCheck: article.seoCheck,
    images: article.images || '',
    aiScore: article.aiScore || '',
    plagiarismScore: article.plagiarismScore || '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)

  const handleAccept = async () => {
    setIsLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: article.id,
          status: 'ACCEPTED',
          originalWc: article.finalWordCount, // Auto-fill from writer's word count
          pageName: article.topicTitle, // Auto-fill page name from topic/title
          pageType: article.articleType, // Auto-fill page type from article type
          sentDate: article.sentDate || today, // Use writer's date or default to today
        }),
      })

      if (response.ok) {
        // Update local state to show accepted status with auto-filled values
        setFormData(prev => ({
          ...prev,
          status: 'ACCEPTED',
          pageName: article.topicTitle,
          pageType: article.articleType,
          sentDate: article.sentDate ? article.sentDate.split('T')[0] : today,
        }))
      } else {
        alert('Failed to accept article')
      }
    } catch (error) {
      console.error('Error accepting article:', error)
      alert('Failed to accept article')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    if (!formData.rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: article.id,
          status: 'REJECTED',
          rejectionReason: formData.rejectionReason,
        }),
      })

      if (response.ok) {
        onSave()
      } else {
        alert('Failed to reject article')
      }
    } catch (error) {
      console.error('Error rejecting article:', error)
      alert('Failed to reject article')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: article.id,
          ...formData,
        }),
      })

      if (response.ok) {
        onSave()
      } else {
        alert('Failed to update article')
      }
    } catch (error) {
      console.error('Error updating article:', error)
      alert('Failed to update article')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Article Details</h2>
            <p className="text-sm text-gray-600">Sl No: {article.slNo} | Status: {formData.status}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Writer Submitted Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Writer Submission</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Requested By:</span>
                <p className="text-gray-900">{article.requestedBy.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Article Type:</span>
                <p className="text-gray-900">{article.articleType.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Brand:</span>
                <p className="text-gray-900">{article.brand.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Topic/Title:</span>
                <p className="text-gray-900">{article.topicTitle}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Game Provider:</span>
                <p className="text-gray-900">{article.gameProvider || '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Primary Keyword:</span>
                <p className="text-gray-900">{article.primaryKeyword || '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Final Word Count:</span>
                <p className="text-gray-900">{article.finalWordCount || '-'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Document:</span>
                {article.documentUrl ? (
                  <a
                    href={article.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View Document
                  </a>
                ) : (
                  <p className="text-gray-400">-</p>
                )}
              </div>
            </div>
          </div>

          {/* Accept/Reject Section - Only show for SUBMITTED status */}
          {formData.status === 'SUBMITTED' && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Article</h3>
              <div className="flex gap-4">
                <button
                  onClick={handleAccept}
                  disabled={isLoading}
                  className="btn-primary"
                >
                  Accept Article
                </button>
                <button
                  onClick={() => setShowRejectForm(!showRejectForm)}
                  className="btn-secondary"
                >
                  {showRejectForm ? 'Cancel Rejection' : 'Reject Article'}
                </button>
              </div>

              {showRejectForm && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason *
                    </label>
                    <select
                      value={formData.rejectionReason}
                      onChange={(e) => setFormData({ ...formData, rejectionReason: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">Select reason...</option>
                      <option value="AI Content Detected">AI Content Detected</option>
                      <option value="Plagiarism Detected">Plagiarism Detected</option>
                      <option value="Poor Quality">Poor Quality</option>
                      <option value="Off Topic">Off Topic</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <button
                    onClick={handleReject}
                    disabled={isLoading || !formData.rejectionReason}
                    className="btn-primary bg-red-600 hover:bg-red-700"
                  >
                    Confirm Rejection
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SEO Processing Fields - Only show for ACCEPTED and beyond */}
          {['ACCEPTED', 'UNPUBLISHED', 'SENT_TO_DEV', 'PUBLISHED'].includes(formData.status) && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Processing</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Name *
                  </label>
                  <input
                    type="text"
                    value={formData.pageName}
                    onChange={(e) => setFormData({ ...formData, pageName: e.target.value })}
                    className="input-field"
                    required
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Type
                  </label>
                  <select
                    value={formData.pageType}
                    onChange={(e) => setFormData({ ...formData, pageType: e.target.value })}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content URL
                  </label>
                  <input
                    type="url"
                    value={formData.contentUrl}
                    onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
                    className="input-field"
                    placeholder="https://"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Original WC
                  </label>
                  <input
                    type="number"
                    value={formData.originalWc}
                    onChange={(e) => setFormData({ ...formData, originalWc: e.target.value })}
                    className="input-field"
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sent Date
                  </label>
                  <input
                    type="date"
                    value={formData.sentDate}
                    onChange={(e) => setFormData({ ...formData, sentDate: e.target.value })}
                    className="input-field"
                  />
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
                    URL (for published articles)
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="input-field"
                    placeholder="https://"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Images Count
                  </label>
                  <input
                    type="number"
                    value={formData.images}
                    onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Score (0-100)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.aiScore}
                    onChange={(e) => setFormData({ ...formData, aiScore: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plagiarism Score (0-100)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.plagiarismScore}
                    onChange={(e) => setFormData({ ...formData, plagiarismScore: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.seoCheck}
                      onChange={(e) => setFormData({ ...formData, seoCheck: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-900">SEO Check Passed</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="ACCEPTED">Accepted</option>
                    <option value="UNPUBLISHED">Unpublished</option>
                    <option value="SENT_TO_DEV">Sent to Dev</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Info - Show if rejected */}
          {formData.status === 'REJECTED' && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Rejected</h3>
              <p className="text-sm text-red-700">Reason: {article.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          {formData.status !== 'SUBMITTED' && formData.status !== 'REJECTED' && (
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
