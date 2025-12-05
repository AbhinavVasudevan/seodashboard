'use client'

import { useState, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  InboxIcon,
  TagIcon,
  PaperAirplaneIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

interface Prospect {
  id: string
  referringPageUrl: string
  rootDomain: string
  domainRating: number | null
  domainTraffic: number | null
  nofollow: boolean
  contactedOn: string | null
  contactMethod: string | null
  contactEmail: string | null
  contactFormUrl: string | null
  remarks: string | null
  content: string | null
  status: string
  source: string | null
  createdAt: string
  updatedAt: string
  brandDeals: Array<{
    id: string
    brand: { id: string; name: string }
  }>
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: string | null
  isDefault: boolean
}

const CATEGORY_OPTIONS = [
  { value: 'SPAM', label: 'Spam', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'FREE_LINK', label: 'Free Link', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'FREE_AFFILIATE', label: 'Free Affiliate', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
]

const STATUS_OPTIONS = [
  { value: 'NOT_CONTACTED', label: 'Not Contacted', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: ClockIcon },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: EnvelopeIcon },
  { value: 'RESPONDED', label: 'Responded', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300', icon: ArrowPathIcon },
  { value: 'NEGOTIATING', label: 'Negotiating', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: PhoneIcon },
  { value: 'DEAL_LOCKED', label: 'Deal Locked', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircleIcon },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: ExclamationCircleIcon },
  { value: 'NO_RESPONSE', label: 'No Response', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', icon: ExclamationCircleIcon },
]

const CONTACT_METHODS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'CONTACT_FORM', label: 'Contact Form' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'OTHER', label: 'Other' },
]

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('NOT_CONTACTED') // Default to NOT_CONTACTED
  const [sourceFilter, setSourceFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null)
  const [formData, setFormData] = useState({
    referringPageUrl: '',
    rootDomain: '',
    domainRating: '',
    domainTraffic: '',
    nofollow: false,
    contactedOn: '',
    contactMethod: '',
    contactEmail: '',
    contactFormUrl: '',
    remarks: '',
    content: '',
    status: 'NOT_CONTACTED',
    source: 'manual'
  })

  // Tag modal state
  const [showTagModal, setShowTagModal] = useState(false)
  const [tagProspect, setTagProspect] = useState<Prospect | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailProspect, setEmailProspect] = useState<Prospect | null>(null)
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    body: ''
  })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [emailTab, setEmailTab] = useState<'templates' | 'compose'>('templates')
  const [templateCategory, setTemplateCategory] = useState<'outreach' | 'followup'>('outreach')

  // Gmail connection state
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailEmail, setGmailEmail] = useState('')
  const [checkingGmail, setCheckingGmail] = useState(true)

  // Get unique sources for filter
  const uniqueSources = Array.from(new Set(prospects.map(p => p.source).filter(Boolean)))

  useEffect(() => {
    fetchProspects()
  }, [statusFilter])

  // Check Gmail connection on mount
  useEffect(() => {
    checkGmailConnection()
    fetchEmailTemplates()
    // Check URL params for Gmail connection result
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('gmail_connected')
    const error = params.get('gmail_error')
    if (connected) {
      setGmailConnected(true)
      setGmailEmail(connected)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (error) {
      alert(`Gmail connection failed: ${error}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const checkGmailConnection = async () => {
    try {
      setCheckingGmail(true)
      const response = await fetch('/api/gmail')
      const data = await response.json()
      setGmailConnected(data.connected)
      setGmailEmail(data.email || '')
    } catch (error) {
      console.error('Error checking Gmail:', error)
    } finally {
      setCheckingGmail(false)
    }
  }

  const connectGmail = async () => {
    try {
      const response = await fetch('/api/gmail?action=auth-url')
      const data = await response.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Error getting auth URL:', error)
      alert('Failed to connect Gmail')
    }
  }

  const disconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail?')) return
    try {
      await fetch('/api/gmail', { method: 'DELETE' })
      setGmailConnected(false)
      setGmailEmail('')
    } catch (error) {
      console.error('Error disconnecting Gmail:', error)
    }
  }

  const fetchEmailTemplates = async () => {
    try {
      const response = await fetch('/api/email-templates')
      const data = await response.json()
      setEmailTemplates(data)

      // Auto-seed templates if none exist
      if (data.length === 0) {
        await seedTemplates()
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const seedTemplates = async () => {
    try {
      const response = await fetch('/api/email-templates/seed', { method: 'POST' })
      if (response.ok) {
        // Refetch templates after seeding
        const templatesResponse = await fetch('/api/email-templates')
        const data = await templatesResponse.json()
        setEmailTemplates(data)
      }
    } catch (error) {
      console.error('Error seeding templates:', error)
    }
  }

  // Group templates by category
  const outreachTemplates = emailTemplates.filter(t => t.category === 'outreach')
  const followupTemplates = emailTemplates.filter(t => t.category === 'followup')
  const otherTemplates = emailTemplates.filter(t => !t.category || (t.category !== 'outreach' && t.category !== 'followup'))

  const fetchProspects = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/backlink-prospects?${params}`)
      const data = await response.json()
      setProspects(data)
    } catch (error) {
      console.error('Error fetching prospects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = '/api/backlink-prospects'
      const method = editingProspect ? 'PUT' : 'POST'
      const body = editingProspect
        ? { id: editingProspect.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setShowModal(false)
        resetForm()
        fetchProspects()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save prospect')
      }
    } catch (error) {
      console.error('Error saving prospect:', error)
      alert('Failed to save prospect')
    }
  }

  const handleQuickStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const updateData: Record<string, unknown> = { id, status: newStatus }

      // Auto-set contacted date when marking as contacted
      if (newStatus === 'CONTACTED') {
        const prospect = prospects.find(p => p.id === id)
        if (!prospect?.contactedOn) {
          updateData.contactedOn = new Date().toISOString().split('T')[0]
        }
      }

      const response = await fetch('/api/backlink-prospects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        fetchProspects()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prospect?')) return

    try {
      const response = await fetch(`/api/backlink-prospects?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchProspects()
      }
    } catch (error) {
      console.error('Error deleting prospect:', error)
    }
  }

  const openEditModal = (prospect: Prospect) => {
    setEditingProspect(prospect)
    setFormData({
      referringPageUrl: prospect.referringPageUrl,
      rootDomain: prospect.rootDomain,
      domainRating: prospect.domainRating?.toString() || '',
      domainTraffic: prospect.domainTraffic?.toString() || '',
      nofollow: prospect.nofollow,
      contactedOn: prospect.contactedOn?.split('T')[0] || '',
      contactMethod: prospect.contactMethod || '',
      contactEmail: prospect.contactEmail || '',
      contactFormUrl: prospect.contactFormUrl || '',
      remarks: prospect.remarks || '',
      content: prospect.content || '',
      status: prospect.status,
      source: prospect.source || 'manual'
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingProspect(null)
    setFormData({
      referringPageUrl: '',
      rootDomain: '',
      domainRating: '',
      domainTraffic: '',
      nofollow: false,
      contactedOn: '',
      contactMethod: '',
      contactEmail: '',
      contactFormUrl: '',
      remarks: '',
      content: '',
      status: 'NOT_CONTACTED',
      source: 'manual'
    })
  }

  const extractDomain = (url: string) => {
    try {
      const parsed = new URL(url)
      setFormData(prev => ({ ...prev, rootDomain: parsed.hostname.replace(/^www\./, '') }))
    } catch {
      // Invalid URL
    }
  }

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.label || status
  }

  // Calculate days since contacted
  const getDaysSinceContacted = (contactedOn: string | null) => {
    if (!contactedOn) return null
    const contacted = new Date(contactedOn)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - contacted.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Filter prospects
  const filteredProspects = prospects.filter(p => {
    const matchesSearch =
      p.referringPageUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.rootDomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSource = !sourceFilter || p.source === sourceFilter
    return matchesSearch && matchesSource
  })

  // Stats - fetch all for stats display
  const [allProspects, setAllProspects] = useState<Prospect[]>([])

  useEffect(() => {
    // Fetch all prospects for stats
    fetch('/api/backlink-prospects')
      .then(res => res.json())
      .then(data => setAllProspects(data))
      .catch(console.error)
  }, [prospects]) // Refetch when prospects change

  const stats = {
    total: allProspects.length,
    notContacted: allProspects.filter(p => p.status === 'NOT_CONTACTED').length,
    contacted: allProspects.filter(p => ['CONTACTED', 'RESPONDED', 'NEGOTIATING'].includes(p.status)).length,
    locked: allProspects.filter(p => p.status === 'DEAL_LOCKED').length,
    rejected: allProspects.filter(p => ['REJECTED', 'NO_RESPONSE'].includes(p.status)).length,
  }

  // Get next status options based on current status
  const getNextStatuses = (currentStatus: string) => {
    switch (currentStatus) {
      case 'NOT_CONTACTED':
        return ['CONTACTED']
      case 'CONTACTED':
        return ['RESPONDED', 'NO_RESPONSE']
      case 'RESPONDED':
        return ['NEGOTIATING', 'REJECTED']
      case 'NEGOTIATING':
        return ['DEAL_LOCKED', 'REJECTED']
      default:
        return []
    }
  }

  const getDRColor = (dr: number | null) => {
    if (!dr) return 'text-muted-foreground'
    if (dr >= 50) return 'text-green-600 font-semibold'
    if (dr >= 30) return 'text-amber-600 font-medium'
    return 'text-foreground'
  }

  // Tag handlers
  const openTagModal = (prospect: Prospect) => {
    setTagProspect(prospect)
    setSelectedCategory('')
    setShowTagModal(true)
  }

  const handleTagDomain = async () => {
    if (!tagProspect || !selectedCategory) return

    try {
      // Add domain to blocked domains
      const response = await fetch('/api/blocked-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: tagProspect.rootDomain,
          type: selectedCategory,
          reason: `Tagged from prospects - ${tagProspect.referringPageUrl}`
        })
      })

      if (response.ok) {
        // Delete the prospect since it's now categorized
        await fetch(`/api/backlink-prospects?id=${tagProspect.id}`, {
          method: 'DELETE'
        })
        setShowTagModal(false)
        setTagProspect(null)
        fetchProspects()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to tag domain')
      }
    } catch (error) {
      console.error('Error tagging domain:', error)
      alert('Failed to tag domain')
    }
  }

  // Email handlers
  const openEmailModal = (prospect: Prospect) => {
    setEmailProspect(prospect)
    setEmailForm({
      to: prospect.contactEmail || '',
      subject: '',
      body: ''
    })
    setSelectedTemplate('')
    setShowEmailPreview(false)
    setEmailTab('templates')
    setTemplateCategory('outreach')
    setShowEmailModal(true)
  }

  // Select template and go to compose
  const selectTemplateCard = (template: EmailTemplate) => {
    handleTemplateSelect(template.id)
    setEmailTab('compose')
  }

  // Insert placeholder at cursor position
  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.querySelector('textarea[name="emailBody"]') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newBody = emailForm.body.substring(0, start) + placeholder + emailForm.body.substring(end)
      setEmailForm({ ...emailForm, body: newBody })
      // Reset cursor position after state update
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length)
      }, 0)
    } else {
      setEmailForm({ ...emailForm, body: emailForm.body + placeholder })
    }
  }

  // Get preview of template body (strip HTML, truncate)
  const getTemplatePreview = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    return text.length > 120 ? text.substring(0, 120) + '...' : text
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = emailTemplates.find(t => t.id === templateId)
    if (template) {
      // Replace placeholders in template
      let subject = template.subject
      let body = template.body

      if (emailProspect) {
        subject = subject.replace(/\{domain\}/g, emailProspect.rootDomain)
        body = body.replace(/\{domain\}/g, emailProspect.rootDomain)
        body = body.replace(/\{url\}/g, emailProspect.referringPageUrl)
      }

      setEmailForm(prev => ({
        ...prev,
        subject,
        body
      }))
    }
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!emailForm.to || !emailForm.subject || !emailForm.body) {
      alert('Please fill in all fields')
      return
    }

    if (!gmailConnected) {
      alert('Please connect your Gmail account first')
      return
    }

    try {
      setSendingEmail(true)
      const response = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailForm.to,
          subject: emailForm.subject,
          body: emailForm.body,
          prospectId: emailProspect?.id,
          templateId: selectedTemplate || undefined
        })
      })

      if (response.ok) {
        // Update prospect status to contacted
        if (emailProspect) {
          await fetch('/api/backlink-prospects', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: emailProspect.id,
              status: 'CONTACTED',
              contactedOn: new Date().toISOString().split('T')[0],
              contactMethod: 'EMAIL',
              contactEmail: emailForm.to
            })
          })
        }
        setShowEmailModal(false)
        setEmailProspect(null)
        fetchProspects()
        alert('Email sent successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <InboxIcon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="page-title">Backlink Prospects</h1>
              <p className="text-sm text-muted-foreground">Manage and track your outreach efforts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Gmail Connection Status */}
            {checkingGmail ? (
              <span className="text-sm text-muted-foreground">Checking Gmail...</span>
            ) : gmailConnected ? (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircleIcon className="h-3 w-3" />
                  {gmailEmail}
                </span>
                <button
                  onClick={disconnectGmail}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectGmail}
                className="btn-secondary text-sm"
              >
                <LinkIcon className="h-4 w-4" />
                Connect Gmail
              </button>
            )}
            <button
              onClick={() => { resetForm(); setShowModal(true) }}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4" />
              Add Prospect
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setStatusFilter('')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === '' ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="stat-value text-foreground">{stats.total}</div>
            <div className="stat-label">Total</div>
          </button>
          <button
            onClick={() => setStatusFilter('NOT_CONTACTED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'NOT_CONTACTED' ? 'ring-2 ring-gray-500' : ''}`}
          >
            <div className="stat-value text-muted-foreground">{stats.notContacted}</div>
            <div className="stat-label">Not Contacted</div>
          </button>
          <button
            onClick={() => setStatusFilter('CONTACTED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'CONTACTED' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="stat-value text-blue-600">{stats.contacted}</div>
            <div className="stat-label">In Progress</div>
          </button>
          <button
            onClick={() => setStatusFilter('DEAL_LOCKED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'DEAL_LOCKED' ? 'ring-2 ring-green-500' : ''}`}
          >
            <div className="stat-value text-green-600">{stats.locked}</div>
            <div className="stat-label">Deal Locked</div>
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'REJECTED' ? 'ring-2 ring-red-500' : ''}`}
          >
            <div className="stat-value text-red-600">{stats.rejected}</div>
            <div className="stat-label">Rejected/No Response</div>
          </button>
        </div>

        {/* Filters */}
        <div className="filter-bar mb-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by URL, domain, or email..."
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
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {uniqueSources.length > 0 && (
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="input-field w-auto"
            >
              <option value="">All Sources</option>
              {uniqueSources.map(source => (
                <option key={source} value={source || ''}>{source?.replace('ahrefs-', '') || 'Unknown'}</option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
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
                    <th>Domain</th>
                    <th>DR</th>
                    <th>Traffic</th>
                    <th>Status</th>
                    <th>Contacted</th>
                    <th>Source</th>
                    <th>Quick Actions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProspects.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">
                          <InboxIcon className="empty-state-icon" />
                          <p className="empty-state-title">No prospects found</p>
                          <p className="empty-state-description">
                            {searchTerm ? 'Try adjusting your search' : 'Import competitor backlinks to find new opportunities'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProspects.map(prospect => {
                      const daysSince = getDaysSinceContacted(prospect.contactedOn)
                      const needsFollowup = prospect.status === 'CONTACTED' && daysSince !== null && daysSince > 7

                      return (
                        <tr key={prospect.id} className={needsFollowup ? 'bg-orange-50 dark:bg-orange-900/10' : ''}>
                          <td>
                            <div>
                              <div className="cell-primary">{prospect.rootDomain}</div>
                              <a
                                href={prospect.referringPageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline truncate block max-w-[250px]"
                              >
                                {prospect.referringPageUrl.replace(/^https?:\/\/(www\.)?/, '').slice(0, 45)}...
                              </a>
                              {prospect.contactEmail && (
                                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <EnvelopeIcon className="h-3 w-3" />
                                  {prospect.contactEmail}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap">
                            <span className={getDRColor(prospect.domainRating)}>
                              {prospect.domainRating || '-'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-muted-foreground">
                            {prospect.domainTraffic ? prospect.domainTraffic.toLocaleString() : '-'}
                          </td>
                          <td className="whitespace-nowrap">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(prospect.status)}`}>
                              {getStatusLabel(prospect.status)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap">
                            {prospect.contactedOn ? (
                              <div>
                                <div className="text-sm text-foreground">
                                  {new Date(prospect.contactedOn).toLocaleDateString()}
                                </div>
                                {daysSince !== null && (
                                  <div className={`text-xs ${needsFollowup ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                                    {daysSince === 0 ? 'Today' : `${daysSince}d ago`}
                                    {needsFollowup && ' · Follow up!'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap">
                            {prospect.source && (
                              <span className="badge-purple text-[10px]">
                                {prospect.source.replace('ahrefs-', '')}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap">
                            <div className="flex gap-1">
                              {getNextStatuses(prospect.status).map(nextStatus => (
                                <button
                                  key={nextStatus}
                                  onClick={() => handleQuickStatusUpdate(prospect.id, nextStatus)}
                                  className={`px-2 py-1 text-[10px] rounded-full transition-opacity hover:opacity-80 ${
                                    STATUS_OPTIONS.find(s => s.value === nextStatus)?.color
                                  }`}
                                  title={`Mark as ${getStatusLabel(nextStatus)}`}
                                >
                                  {getStatusLabel(nextStatus)}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="whitespace-nowrap">
                            <div className="flex gap-1">
                              <button
                                onClick={() => openTagModal(prospect)}
                                className="action-btn text-orange-600 hover:text-orange-700"
                                title="Tag as Spam/Free"
                              >
                                <TagIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEmailModal(prospect)}
                                className="action-btn text-blue-600 hover:text-blue-700"
                                title="Send Email"
                              >
                                <PaperAirplaneIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(prospect)}
                                className="action-btn"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(prospect.id)}
                                className="action-btn text-red-600 hover:text-red-700"
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl max-h-[90vh] flex flex-col">
            <div className="modal-header flex-shrink-0">
              <h3 className="modal-title">
                {editingProspect ? 'Edit Prospect' : 'Add Prospect'}
              </h3>
              <button onClick={() => setShowModal(false)} className="action-btn">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="input-label">Referring Page URL *</label>
                    <input
                      type="url"
                      value={formData.referringPageUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, referringPageUrl: e.target.value })
                        extractDomain(e.target.value)
                      }}
                      className="input-field"
                      required
                      placeholder="https://example.com/page"
                    />
                  </div>

                  <div>
                    <label className="input-label">Root Domain *</label>
                    <input
                      type="text"
                      value={formData.rootDomain}
                      onChange={(e) => setFormData({ ...formData, rootDomain: e.target.value })}
                      className="input-field"
                      required
                      placeholder="example.com"
                    />
                  </div>

                  <div>
                    <label className="input-label">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input-field"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="input-label">Domain Rating</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.domainRating}
                      onChange={(e) => setFormData({ ...formData, domainRating: e.target.value })}
                      className="input-field"
                      placeholder="0-100"
                    />
                  </div>

                  <div>
                    <label className="input-label">Domain Traffic</label>
                    <input
                      type="number"
                      value={formData.domainTraffic}
                      onChange={(e) => setFormData({ ...formData, domainTraffic: e.target.value })}
                      className="input-field"
                      placeholder="Monthly traffic"
                    />
                  </div>

                  <div>
                    <label className="input-label">Contacted On</label>
                    <input
                      type="date"
                      value={formData.contactedOn}
                      onChange={(e) => setFormData({ ...formData, contactedOn: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="input-label">Contact Method</label>
                    <select
                      value={formData.contactMethod}
                      onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select...</option>
                      {CONTACT_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="input-label">Contact Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="input-field"
                      placeholder="contact@example.com"
                    />
                  </div>

                  <div>
                    <label className="input-label">Contact Form URL</label>
                    <input
                      type="url"
                      value={formData.contactFormUrl}
                      onChange={(e) => setFormData({ ...formData, contactFormUrl: e.target.value })}
                      className="input-field"
                      placeholder="https://example.com/contact"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="input-label">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="input-field"
                      rows={2}
                      placeholder="Notes about this prospect..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="nofollow"
                      checked={formData.nofollow}
                      onChange={(e) => setFormData({ ...formData, nofollow: e.target.checked })}
                      className="h-4 w-4 text-primary rounded border-input focus:ring-ring"
                    />
                    <label htmlFor="nofollow" className="text-sm text-foreground">
                      Nofollow Link
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProspect ? 'Update' : 'Add'} Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && tagProspect && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="modal-title">Tag Domain</h3>
              <button onClick={() => setShowTagModal(false)} className="action-btn">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-muted-foreground mb-4">
                Tag <strong className="text-foreground">{tagProspect.rootDomain}</strong> as:
              </p>
              <div className="space-y-2">
                {CATEGORY_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedCategory(option.value)}
                    className={`w-full px-4 py-3 rounded-lg border text-left transition-all ${
                      selectedCategory === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs ${option.color}`}>
                      {option.label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.value === 'SPAM' && 'Black hat SEO, link farms, PBNs - always hidden'}
                      {option.value === 'FREE_LINK' && 'Organic/natural links - visible but tagged'}
                      {option.value === 'FREE_AFFILIATE' && 'Affiliate sites linking without payment'}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                This will remove the prospect and add the domain to the blocked list.
              </p>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowTagModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleTagDomain}
                disabled={!selectedCategory}
                className="btn-primary"
              >
                <TagIcon className="h-4 w-4" />
                Tag Domain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal - Redesigned */}
      {showEmailModal && emailProspect && (
        <div className="modal-overlay">
          <div className="modal-content max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header with prospect info */}
            <div className="modal-header flex-shrink-0 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <EnvelopeIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{emailProspect.rootDomain}</h3>
                  <a
                    href={emailProspect.referringPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary truncate block max-w-[300px]"
                  >
                    {emailProspect.referringPageUrl}
                  </a>
                </div>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="action-btn">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Gmail Connection Warning */}
            {!gmailConnected && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Connect Gmail to send emails directly
                </p>
                <button
                  type="button"
                  onClick={connectGmail}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Connect
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border px-4">
              <button
                type="button"
                onClick={() => setEmailTab('templates')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  emailTab === 'templates'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Choose Template
              </button>
              <button
                type="button"
                onClick={() => setEmailTab('compose')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  emailTab === 'compose'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Compose Email
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="flex flex-col flex-1 overflow-hidden">
              {/* Templates Tab */}
              {emailTab === 'templates' && (
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Category Toggle */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setTemplateCategory('outreach')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        templateCategory === 'outreach'
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      Outreach ({outreachTemplates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateCategory('followup')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        templateCategory === 'followup'
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      Follow-up ({followupTemplates.length})
                    </button>
                  </div>

                  {/* Template Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(templateCategory === 'outreach' ? outreachTemplates : followupTemplates).map(template => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => selectTemplateCard(template)}
                        className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                          selectedTemplate === template.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium text-sm text-foreground mb-1">
                          {template.name.replace('Outreach - ', '').replace('Follow-up - ', '')}
                        </div>
                        <div className="text-xs text-primary/80 mb-2 truncate">
                          {template.subject}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {getTemplatePreview(template.body)}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Blank template option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplate('')
                      setEmailForm({ ...emailForm, subject: '', body: '' })
                      setEmailTab('compose')
                    }}
                    className="w-full mt-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-center transition-all"
                  >
                    <PlusIcon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <div className="text-sm text-muted-foreground">Start from scratch</div>
                  </button>
                </div>
              )}

              {/* Compose Tab */}
              {emailTab === 'compose' && (
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border h-full">
                    {/* Editor Side */}
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="input-label">To</label>
                        <input
                          type="email"
                          value={emailForm.to}
                          onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                          className="input-field"
                          placeholder="contact@example.com"
                          required
                        />
                      </div>

                      <div>
                        <label className="input-label">Subject</label>
                        <input
                          type="text"
                          value={emailForm.subject}
                          onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                          className="input-field"
                          placeholder="Subject line..."
                          required
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <label className="input-label mb-0">Body</label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => insertPlaceholder('{domain}')}
                              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                              title="Insert domain placeholder"
                            >
                              +domain
                            </button>
                            <button
                              type="button"
                              onClick={() => insertPlaceholder('{url}')}
                              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                              title="Insert URL placeholder"
                            >
                              +url
                            </button>
                          </div>
                        </div>
                        <textarea
                          name="emailBody"
                          value={emailForm.body}
                          onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                          className="input-field font-mono text-xs leading-relaxed"
                          rows={12}
                          placeholder="Write your email here... HTML is supported."
                          required
                        />
                      </div>
                    </div>

                    {/* Preview Side */}
                    <div className="p-4 bg-muted/20">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        Live Preview
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-border overflow-hidden">
                        {/* Email Header Preview */}
                        <div className="px-4 py-3 border-b border-border bg-muted/30">
                          <div className="text-xs text-muted-foreground mb-1">To: {emailForm.to || 'recipient@example.com'}</div>
                          <div className="font-medium text-sm">{emailForm.subject || 'No subject'}</div>
                        </div>
                        {/* Email Body Preview */}
                        <div
                          className="p-4 prose prose-sm dark:prose-invert max-w-none min-h-[250px] text-sm"
                          dangerouslySetInnerHTML={{
                            __html: emailForm.body
                              .replace(/\{domain\}/g, `<span class="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 rounded">${emailProspect.rootDomain}</span>`)
                              .replace(/\{url\}/g, `<span class="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1 rounded text-xs">${emailProspect.referringPageUrl}</span>`)
                              || '<p class="text-muted-foreground italic">Your email preview will appear here...</p>'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="modal-footer flex-shrink-0 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {selectedTemplate && (
                    <span className="bg-muted px-2 py-1 rounded">
                      Using: {emailTemplates.find(t => t.id === selectedTemplate)?.name.replace('Outreach - ', '').replace('Follow-up - ', '')}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {emailTab === 'compose' && (
                    <button
                      type="button"
                      onClick={() => setEmailTab('templates')}
                      className="btn-secondary"
                    >
                      Back to Templates
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEmail || !gmailConnected || emailTab === 'templates'}
                    className="btn-primary"
                  >
                    {sendingEmail ? (
                      <>
                        <div className="spinner-sm border-white/30 border-t-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="h-4 w-4" />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
