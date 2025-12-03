'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Article {
  id: string
  slNo: string
  requestedBy: { name: string; email: string }
  writtenBy?: { name: string; email: string } | null
  articleType: string
  brand: { name: string }
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

interface ArticleDetailModalProps {
  article: Article
  onClose: () => void
  onSave: () => void
}

export default function ArticleDetailModal({ article, onClose, onSave }: ArticleDetailModalProps) {
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
    finalWordCount: article.finalWordCount || '',
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

  const scoresEntered = formData.aiScore !== '' && formData.plagiarismScore !== ''
  const canSelectLive = formData.url.trim() !== ''

  const handleAccept = async () => {
    if (!scoresEntered) {
      toast.error('Please enter both AI Score and Plagiarism Score before accepting')
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
          writer: initialWriter,
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
        toast.success('Article accepted')
      } else {
        toast.error('Failed to accept article')
      }
    } catch (error) {
      console.error('Error accepting article:', error)
      toast.error('Failed to accept article')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    if (!formData.rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    if (!scoresEntered) {
      toast.error('Please enter both scores before rejecting')
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
        toast.success('Article rejected')
        onSave()
      } else {
        toast.error('Failed to reject article')
      }
    } catch (error) {
      console.error('Error rejecting article:', error)
      toast.error('Failed to reject article')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (formData.status === 'LIVE' && !formData.url.trim()) {
      toast.error('URL is required for Live status')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: article.id, ...formData }),
      })
      if (response.ok) {
        toast.success('Article saved')
        onSave()
      } else {
        toast.error('Failed to update article')
      }
    } catch (error) {
      console.error('Error updating article:', error)
      toast.error('Failed to update article')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'LIVE' && !canSelectLive) {
      toast.error('Please fill in the URL field before setting status to Live')
      return
    }
    setFormData({ ...formData, status: newStatus })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return <Badge variant="secondary">Submitted</Badge>
      case 'ACCEPTED': return <Badge className="bg-blue-100 text-blue-800">Accepted</Badge>
      case 'REJECTED': return <Badge variant="destructive">Rejected</Badge>
      case 'SENT_TO_DEV': return <Badge className="bg-purple-100 text-purple-800">Sent to Dev</Badge>
      case 'LIVE': return <Badge className="bg-green-100 text-green-800">Live</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Article Details</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">Sl No: {article.slNo}</span>
                {getStatusBadge(formData.status)}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Writer Submission Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-3">Writer Submission</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Requested By:</span> <span className="font-medium">{article.requestedBy.name}</span></div>
              <div><span className="text-muted-foreground">Writer:</span> <span className="font-medium">{article.writtenBy?.name || 'Not assigned'}</span></div>
              <div><span className="text-muted-foreground">Article Type:</span> <span className="font-medium">{article.articleType.replace('_', ' ')}</span></div>
              <div><span className="text-muted-foreground">Brand:</span> <span className="font-medium">{article.brand.name}</span></div>
              <div><span className="text-muted-foreground">Topic:</span> <span className="font-medium">{article.topicTitle}</span></div>
              <div><span className="text-muted-foreground">Game Provider:</span> <span className="font-medium">{article.gameProvider || '-'}</span></div>
              <div><span className="text-muted-foreground">Primary Keyword:</span> <span className="font-medium">{article.primaryKeyword || '-'}</span></div>
              <div><span className="text-muted-foreground">Word Count:</span> <span className="font-medium">{article.finalWordCount || '-'}</span></div>
              <div className="md:col-span-2">
                <span className="text-muted-foreground">Document: </span>
                {article.documentUrl ? (
                  <a href={article.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Document</a>
                ) : <span className="text-muted-foreground">-</span>}
              </div>
            </div>
          </div>

          {/* Review Section - SUBMITTED status */}
          {formData.status === 'SUBMITTED' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Review Article</h3>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription>
                  <p className="font-medium text-blue-900 mb-3">Step 1: Enter Quality Scores</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>AI Score (0-100) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.aiScore}
                        onChange={(e) => setFormData({ ...formData, aiScore: e.target.value })}
                        placeholder="Enter AI detection score"
                      />
                      <p className="text-xs text-muted-foreground">Lower is better (0 = no AI detected)</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Plagiarism Score (0-100) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.plagiarismScore}
                        onChange={(e) => setFormData({ ...formData, plagiarismScore: e.target.value })}
                        placeholder="Enter plagiarism score"
                      />
                      <p className="text-xs text-muted-foreground">Lower is better (0 = no plagiarism)</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className={`p-4 bg-muted rounded-lg ${!scoresEntered ? 'opacity-60' : ''}`}>
                <p className="font-medium mb-3">Step 2: Make Decision</p>
                {!scoresEntered && <p className="text-sm text-amber-600 mb-3">Please enter both scores above first</p>}
                <div className="flex gap-3 mb-4">
                  <Button onClick={handleAccept} disabled={isLoading || !scoresEntered}>Accept Article</Button>
                  <Button variant="outline" onClick={() => setShowRejectForm(!showRejectForm)} disabled={!scoresEntered}>
                    {showRejectForm ? 'Cancel Rejection' : 'Reject Article'}
                  </Button>
                </div>
                {showRejectForm && scoresEntered && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="space-y-2">
                      <Label>Rejection Reason *</Label>
                      <Select value={formData.rejectionReason} onValueChange={(v) => setFormData({ ...formData, rejectionReason: v })}>
                        <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AI Content Detected">AI Content Detected</SelectItem>
                          <SelectItem value="Plagiarism Detected">Plagiarism Detected</SelectItem>
                          <SelectItem value="Poor Quality">Poor Quality</SelectItem>
                          <SelectItem value="Off Topic">Off Topic</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="destructive" onClick={handleReject} disabled={isLoading || !formData.rejectionReason}>
                      Confirm Rejection
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEO Processing - ACCEPTED and beyond */}
          {['ACCEPTED', 'SENT_TO_DEV', 'LIVE'].includes(formData.status) && (
            <div className="space-y-4">
              <h3 className="font-semibold">SEO Processing</h3>

              <div className="p-4 bg-green-50 rounded-lg">
                <p className="font-medium text-green-900 mb-3">Quality Scores</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>AI Score (0-100)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.aiScore}
                      onChange={(e) => setFormData({ ...formData, aiScore: e.target.value })}
                      className={Number(formData.aiScore) > 20 ? 'border-destructive' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plagiarism Score (0-100)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.plagiarismScore}
                      onChange={(e) => setFormData({ ...formData, plagiarismScore: e.target.value })}
                      className={Number(formData.plagiarismScore) > 10 ? 'border-destructive' : ''}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-3">Content Details</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Page Name *</Label>
                    <Input value={formData.pageName} onChange={(e) => setFormData({ ...formData, pageName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EN">English</SelectItem>
                        <SelectItem value="ES">Spanish</SelectItem>
                        <SelectItem value="HI">Hindi</SelectItem>
                        <SelectItem value="DE">German</SelectItem>
                        <SelectItem value="FI">Finnish</SelectItem>
                        <SelectItem value="DA">Danish</SelectItem>
                        <SelectItem value="SV">Swedish</SelectItem>
                        <SelectItem value="GA">Irish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Page Type</Label>
                    <Select value={formData.pageType} onValueChange={(v) => setFormData({ ...formData, pageType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARTICLE">Article</SelectItem>
                        <SelectItem value="CATEGORY">Category</SelectItem>
                        <SelectItem value="APP_REVIEW">App Review</SelectItem>
                        <SelectItem value="GAME_REVIEW">Game Review</SelectItem>
                        <SelectItem value="GUEST_POST">Guest Post</SelectItem>
                        <SelectItem value="BRAND_REVIEW">Brand Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Final Word Count</Label>
                    <Input type="number" value={formData.finalWordCount} onChange={(e) => setFormData({ ...formData, finalWordCount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Original WC</Label>
                    <Input type="number" value={formData.originalWc} onChange={(e) => setFormData({ ...formData, originalWc: e.target.value })} />
                  </div>
                </div>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription>
                  <p className="font-medium text-blue-900 mb-3">Document Links</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Final Doc (Google Doc)</Label>
                      <div className="flex gap-2">
                        <Input value={formData.contentUrl} onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })} placeholder="https://docs.google.com/..." />
                        {formData.contentUrl && <Button variant="outline" size="sm" asChild><a href={formData.contentUrl} target="_blank" rel="noopener noreferrer">Open</a></Button>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Live URL {!canSelectLive && <span className="text-amber-600">(Required for Live)</span>}</Label>
                      <div className="flex gap-2">
                        <Input value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="https://example.com/article-url" className={formData.status === 'LIVE' && !canSelectLive ? 'border-destructive' : ''} />
                        {formData.url && <Button variant="outline" size="sm" asChild><a href={formData.url} target="_blank" rel="noopener noreferrer">View</a></Button>}
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Writer</Label>
                  <Input value={formData.writer} onChange={(e) => setFormData({ ...formData, writer: e.target.value })} readOnly={!!article.writtenBy} className={article.writtenBy ? 'bg-muted' : ''} />
                </div>
                <div className="space-y-2">
                  <Label>Sent Date</Label>
                  <Input type="date" value={formData.sentDate} onChange={(e) => setFormData({ ...formData, sentDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Publish Date</Label>
                  <Input type="date" value={formData.publishDate} onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Images</Label>
                  <Input type="number" value={formData.images} onChange={(e) => setFormData({ ...formData, images: e.target.value })} placeholder="0" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox id="seoCheck" checked={formData.seoCheck} onCheckedChange={(v) => setFormData({ ...formData, seoCheck: !!v })} />
                  <Label htmlFor="seoCheck" className="cursor-pointer">SEO Check Passed</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Label>Status:</Label>
                  <Select value={formData.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="SENT_TO_DEV">Sent to Dev</SelectItem>
                      <SelectItem value="LIVE" disabled={!canSelectLive}>Live {!canSelectLive && '(Requires URL)'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Rejected Info */}
          {formData.status === 'REJECTED' && (
            <Alert variant="destructive">
              <AlertDescription>
                <p className="font-semibold mb-2">Rejected</p>
                <p className="text-sm mb-2">Reason: {article.rejectionReason}</p>
                {(article.aiScore !== null || article.plagiarismScore !== null) && (
                  <p className="text-sm border-t border-destructive/20 pt-2 mt-2">
                    AI Score: {article.aiScore ?? 'N/A'}% | Plagiarism Score: {article.plagiarismScore ?? 'N/A'}%
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          {formData.status !== 'SUBMITTED' && formData.status !== 'REJECTED' && (
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
