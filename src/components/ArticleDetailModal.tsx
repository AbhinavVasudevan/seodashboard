'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

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
  // Determine initial writer - prefer writtenBy relation, then existing writer field
  const initialWriter = article.writtenBy?.name || article.writer || ''

  const [formData, setFormData] = useState({
    status: article.status,
    rejectionReason: article.rejectionReason || '',
    pageName: article.pageName || article.topicTitle || '',
    language: article.language || 'EN',
    url: article.url || '',
    pageType: article.pageType || article.articleType,
    contentUrl: article.contentUrl || '',
    originalWc: article.originalWc || article.finalWordCount || '',
    writer: initialWriter,
    sentDate: article.sentDate ? article.sentDate.split('T')[0] : new Date().toISOString().split('T')[0],
    publishDate: article.publishDate ? article.publishDate.split('T')[0] : '',
    seoCheck: article.seoCheck,
    images: article.images || '',
    aiScore: article.aiScore ?? '',
    plagiarismScore: article.plagiarismScore ?? '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [reviewStep, setReviewStep] = useState<'scores' | 'decision'>('scores')

  // Check if scores are filled for review step
  const scoresEntered = formData.aiScore !== '' && formData.plagiarismScore !== ''

  // Check if URL is filled for Live status validation
  const canSelectLive = formData.url.trim() !== ''

  const handleAccept = async () => {
    if (!scoresEntered) {
      alert('Please enter both AI Score and Plagiarism Score before accepting')
      return
    }

    setIsLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: article.id,
          status: 'ACCEPTED',
          aiScore: formData.aiScore,
          plagiarismScore: formData.plagiarismScore,
          originalWc: article.finalWordCount,
          pageName: article.topicTitle,
          pageType: article.articleType,
          sentDate: article.sentDate || today,
          writer: initialWriter, // Auto-fill writer from writtenBy
        }),
      })

      if (response.ok) {
        setFormData(prev => ({
          ...prev,
          status: 'ACCEPTED',
          pageName: article.topicTitle,
          pageType: article.articleType,
          sentDate: article.sentDate ? article.sentDate.split('T')[0] : today,
          writer: initialWriter,
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

    if (!scoresEntered) {
      alert('Please enter both AI Score and Plagiarism Score before rejecting')
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
          aiScore: formData.aiScore,
          plagiarismScore: formData.plagiarismScore,
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
    // Validate Live status requires URL
    if (formData.status === 'LIVE' && !formData.url.trim()) {
      alert('URL is required for Live status')
      return
    }

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

  // Handle status change with Live validation
  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'LIVE' && !canSelectLive) {
      alert('Please fill in the URL field before setting status to Live')
      return
    }
    setFormData({ ...formData, status: newStatus })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Article Details</h2>
            <p className="text-sm text-gray-600">Sl No: {article.slNo} | Status: {formData.status.replace('_', ' ')}</p>
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
                <span className="font-medium text-gray-700">Writer:</span>
                <p className="text-gray-900">{article.writtenBy?.name || 'Not assigned'}</p>
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
              <div className="md:col-span-2">
                <span className="font-medium text-gray-700">Document:</span>
                {article.documentUrl ? (
                  <a
                    href={article.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 ml-2"
                  >
                    View Document
                  </a>
                ) : (
                  <span className="text-gray-400 ml-2">-</span>
                )}
              </div>
            </div>
          </div>

          {/* Review Section - Only show for SUBMITTED status */}
          {formData.status === 'SUBMITTED' && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Article</h3>

              {/* Step 1: Enter Scores */}
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h4 className="text-md font-medium text-blue-900 mb-3">Step 1: Enter Quality Scores</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Score (0-100) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.aiScore}
                      onChange={(e) => setFormData({ ...formData, aiScore: e.target.value })}
                      className="input-field"
                      placeholder="Enter AI detection score"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Lower is better (0 = no AI detected)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plagiarism Score (0-100) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.plagiarismScore}
                      onChange={(e) => setFormData({ ...formData, plagiarismScore: e.target.value })}
                      className="input-field"
                      placeholder="Enter plagiarism score"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Lower is better (0 = no plagiarism)</p>
                  </div>
                </div>
              </div>

              {/* Step 2: Accept or Reject */}
              <div className={`bg-gray-50 p-4 rounded-lg ${!scoresEntered ? 'opacity-60' : ''}`}>
                <h4 className="text-md font-medium text-gray-900 mb-3">Step 2: Make Decision</h4>
                {!scoresEntered && (
                  <p className="text-sm text-amber-600 mb-3">Please enter both scores above first</p>
                )}

                <div className="flex gap-4 mb-4">
                  <button
                    onClick={handleAccept}
                    disabled={isLoading || !scoresEntered}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Accept Article
                  </button>
                  <button
                    onClick={() => setShowRejectForm(!showRejectForm)}
                    disabled={!scoresEntered}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {showRejectForm ? 'Cancel Rejection' : 'Reject Article'}
                  </button>
                </div>

                {showRejectForm && scoresEntered && (
                  <div className="mt-4 space-y-4 border-t pt-4">
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
            </div>
          )}

          {/* SEO Processing Fields - Only show for ACCEPTED and beyond */}
          {['ACCEPTED', 'SENT_TO_DEV', 'LIVE'].includes(formData.status) && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Processing</h3>

              {/* Editable Quality Scores */}
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h4 className="text-md font-medium text-green-900 mb-3">Quality Scores</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AI Score (0-100)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.aiScore}
                      onChange={(e) => setFormData({ ...formData, aiScore: e.target.value })}
                      className={`input-field ${Number(formData.aiScore) > 20 ? 'border-red-300' : ''}`}
                      placeholder="Enter AI score"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plagiarism Score (0-100)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.plagiarismScore}
                      onChange={(e) => setFormData({ ...formData, plagiarismScore: e.target.value })}
                      className={`input-field ${Number(formData.plagiarismScore) > 10 ? 'border-red-300' : ''}`}
                      placeholder="Enter plagiarism score"
                    />
                  </div>
                </div>
              </div>

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
                    Final Doc
                  </label>
                  <input
                    type="url"
                    value={formData.contentUrl}
                    onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
                    className="input-field"
                    placeholder="https://docs.google.com/..."
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
                    className="input-field bg-gray-50"
                    readOnly={!!article.writtenBy}
                    title={article.writtenBy ? 'Auto-filled from writer account' : ''}
                  />
                  {article.writtenBy && (
                    <p className="text-xs text-gray-500 mt-1">Auto-filled from writer account</p>
                  )}
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL (Published Article) {formData.status === 'LIVE' || canSelectLive ? '' : '- Required for Live status'}
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className={`input-field ${formData.status === 'LIVE' && !canSelectLive ? 'border-red-500' : ''}`}
                    placeholder="https://example.com/article-url"
                  />
                  {!canSelectLive && (
                    <p className="text-xs text-amber-600 mt-1">Fill this to enable Live status</p>
                  )}
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

                <div className="flex items-center">
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
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="input-field"
                  >
                    <option value="ACCEPTED">Accepted</option>
                    <option value="SENT_TO_DEV">Sent to Dev</option>
                    <option value="LIVE" disabled={!canSelectLive}>
                      Live {!canSelectLive ? '(Requires URL)' : ''}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Info - Show if rejected */}
          {formData.status === 'REJECTED' && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Rejected</h3>
              <p className="text-sm text-red-700 mb-2">Reason: {article.rejectionReason}</p>
              {(article.aiScore !== null || article.plagiarismScore !== null) && (
                <div className="mt-2 pt-2 border-t border-red-200">
                  <p className="text-sm text-red-700">
                    AI Score: {article.aiScore ?? 'N/A'}% | Plagiarism Score: {article.plagiarismScore ?? 'N/A'}%
                  </p>
                </div>
              )}
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
