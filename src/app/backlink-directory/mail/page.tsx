'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  InboxIcon,
  PaperAirplaneIcon,
  StarIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  XMarkIcon,
  ChevronLeftIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  LinkIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  FlagIcon,
  UserCircleIcon,
  ArrowUturnLeftIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface EmailThread {
  id: string
  gmailThreadId: string
  subject: string
  snippet: string
  participants: string[]
  hasInbound: boolean
  hasOutbound: boolean
  lastDirection: string | null
  lastSenderEmail: string | null
  lastSenderName: string | null
  isRead: boolean
  isStarred: boolean
  isArchived: boolean
  needsFollowUp: boolean
  followUpDate: string | null
  messageCount: number
  unreadCount: number
  lastMessageAt: string
  prospectId: string | null
  prospect: {
    id: string
    rootDomain: string
    status: string
    domainRating: number | null
  } | null
  linkDirectoryDomain: {
    id: string
    rootDomain: string
    currentPrice: number | null
  } | null
  messages: {
    fromEmail: string
    fromName: string | null
    direction: string
    sentAt: string
  }[]
}

interface EmailMessage {
  id: string
  gmailMessageId: string
  fromEmail: string
  fromName: string | null
  toEmails: string[]
  ccEmails: string[]
  subject: string
  snippet: string
  bodyHtml: string | null
  bodyText: string | null
  direction: string
  isRead: boolean
  isStarred: boolean
  labels: string[]
  hasAttachments: boolean
  attachmentCount: number
  sentAt: string
}

interface ThreadDetail {
  id: string
  gmailThreadId: string
  subject: string
  snippet: string
  participants: string[]
  isRead: boolean
  isStarred: boolean
  needsFollowUp: boolean
  followUpDate: string | null
  prospectId: string | null
  prospect: {
    id: string
    rootDomain: string
    status: string
    domainRating: number | null
    contactEmail: string | null
  } | null
  linkDirectoryDomain: {
    id: string
    rootDomain: string
    currentPrice: number | null
  } | null
  messages: EmailMessage[]
}

interface MailStats {
  total: number
  unread: number
  starred: number
  followup: number
  withProspect: number
  sent: number
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: string | null
}

type Folder = 'inbox' | 'sent' | 'starred' | 'followup' | 'all'

const FOLDERS = [
  { id: 'inbox' as Folder, label: 'Inbox', icon: InboxIcon },
  { id: 'sent' as Folder, label: 'Sent', icon: PaperAirplaneIcon },
  { id: 'starred' as Folder, label: 'Starred', icon: StarIcon },
  { id: 'followup' as Folder, label: 'Follow-up', icon: ClockIcon },
]

export default function MailPage() {
  // State
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox')
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null)
  const [stats, setStats] = useState<MailStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Gmail connection state
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailEmail, setGmailEmail] = useState('')
  const [checkingGmail, setCheckingGmail] = useState(true)

  // Compose modal state
  const [showCompose, setShowCompose] = useState(false)
  const [composeMode, setComposeMode] = useState<'new' | 'reply'>('new')
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: '',
    threadId: '',
    inReplyTo: ''
  })
  const [isSending, setIsSending] = useState(false)

  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')

  // Check Gmail connection on mount
  useEffect(() => {
    checkGmailConnection()
    fetchTemplates()
  }, [])

  // Fetch threads when folder or page changes
  useEffect(() => {
    if (gmailConnected) {
      fetchThreads()
      fetchStats()
    }
  }, [activeFolder, page, gmailConnected])

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
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/email-templates')
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/mail?action=stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchThreads = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        folder: activeFolder,
        page: page.toString(),
        limit: '50'
      })
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/mail?${params}`)
      if (response.ok) {
        const data = await response.json()
        setThreads(data.threads)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error('Error fetching threads:', error)
    } finally {
      setIsLoading(false)
    }
  }, [activeFolder, page, searchTerm])

  const syncEmails = async () => {
    try {
      setIsSyncing(true)
      const response = await fetch('/api/mail?action=sync&maxResults=100')
      if (response.ok) {
        const data = await response.json()
        console.log(`Synced ${data.syncedCount} threads`)
        fetchThreads()
        fetchStats()
      }
    } catch (error) {
      console.error('Error syncing:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const loadThread = async (threadId: string) => {
    try {
      setIsLoadingThread(true)
      const response = await fetch(`/api/mail/thread/${threadId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedThread(data)
        // Update thread in list as read
        setThreads(prev => prev.map(t =>
          t.id === threadId ? { ...t, isRead: true, unreadCount: 0 } : t
        ))
      }
    } catch (error) {
      console.error('Error loading thread:', error)
    } finally {
      setIsLoadingThread(false)
    }
  }

  const toggleStar = async (threadId: string, isStarred: boolean) => {
    try {
      await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleStar', threadId, isStarred: !isStarred })
      })
      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, isStarred: !isStarred } : t
      ))
      if (selectedThread?.id === threadId) {
        setSelectedThread(prev => prev ? { ...prev, isStarred: !isStarred } : null)
      }
    } catch (error) {
      console.error('Error toggling star:', error)
    }
  }

  const toggleFollowUp = async (threadId: string, needsFollowUp: boolean) => {
    try {
      await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleFollowUp', threadId, needsFollowUp: !needsFollowUp })
      })
      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, needsFollowUp: !needsFollowUp } : t
      ))
      if (selectedThread?.id === threadId) {
        setSelectedThread(prev => prev ? { ...prev, needsFollowUp: !needsFollowUp } : null)
      }
      fetchStats()
    } catch (error) {
      console.error('Error toggling follow-up:', error)
    }
  }

  const archiveThread = async (threadId: string) => {
    try {
      await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', threadId })
      })
      setThreads(prev => prev.filter(t => t.id !== threadId))
      if (selectedThread?.id === threadId) {
        setSelectedThread(null)
      }
      fetchStats()
    } catch (error) {
      console.error('Error archiving:', error)
    }
  }

  const openCompose = (mode: 'new' | 'reply' = 'new', replyTo?: EmailMessage) => {
    setComposeMode(mode)
    if (mode === 'reply' && replyTo && selectedThread) {
      setComposeData({
        to: replyTo.direction === 'INBOUND' ? replyTo.fromEmail : replyTo.toEmails[0],
        subject: replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`,
        body: '',
        threadId: selectedThread.id,
        inReplyTo: replyTo.gmailMessageId
      })
    } else {
      setComposeData({
        to: '',
        subject: '',
        body: '',
        threadId: '',
        inReplyTo: ''
      })
    }
    setSelectedTemplate('')
    setShowCompose(true)
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setComposeData(prev => ({
        ...prev,
        subject: template.subject,
        body: template.body
      }))
    }
  }

  const sendEmail = async () => {
    if (!composeData.to || !composeData.subject || !composeData.body) {
      alert('Please fill in all fields')
      return
    }

    try {
      setIsSending(true)
      const url = composeMode === 'reply' && composeData.threadId
        ? `/api/mail/thread/${composeData.threadId}`
        : '/api/mail/send'

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeData.to,
          subject: composeData.subject,
          message: composeData.body,
          inReplyTo: composeData.inReplyTo
        })
      })

      if (response.ok) {
        setShowCompose(false)
        setComposeData({ to: '', subject: '', body: '', threadId: '', inReplyTo: '' })
        // Refresh after a short delay to allow Gmail to process
        setTimeout(() => {
          syncEmails()
        }, 2000)
        alert('Email sent successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email')
    } finally {
      setIsSending(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isThisYear = date.getFullYear() === now.getFullYear()

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (isThisYear) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  const getParticipantDisplay = (thread: EmailThread) => {
    // For sent folder, show "To: recipient"
    if (activeFolder === 'sent' && thread.lastDirection === 'OUTBOUND') {
      // Get the recipient from the last message or participants
      const recipients = thread.participants.filter(p =>
        p !== thread.lastSenderEmail && p.includes('@')
      )
      if (recipients.length > 0) {
        const recipientEmail = recipients[0]
        const recipientName = recipientEmail.split('@')[0]
        return `To: ${recipientName}`
      }
    }

    // For inbox or mixed threads, show the sender
    if (thread.lastSenderName) return thread.lastSenderName
    if (thread.lastSenderEmail) {
      // Extract name part from email (before @)
      return thread.lastSenderEmail.split('@')[0]
    }

    // Fallback to first message data
    const lastMsg = thread.messages[0]
    if (lastMsg?.fromName) return lastMsg.fromName
    if (lastMsg?.fromEmail) return lastMsg.fromEmail.split('@')[0]

    // Last resort - first participant
    const firstParticipant = thread.participants[0]
    if (firstParticipant) {
      return firstParticipant.split('@')[0]
    }

    return 'Unknown'
  }

  // Gmail not connected state
  if (!checkingGmail && !gmailConnected) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="p-4 bg-primary/10 rounded-full mb-6">
            <EnvelopeIcon className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Connect Gmail</h1>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Connect your Gmail account to view and manage your link building outreach emails directly from the dashboard.
          </p>
          <button onClick={connectGmail} className="btn-primary">
            <LinkIcon className="h-5 w-5" />
            Connect Gmail Account
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (checkingGmail) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="spinner-lg text-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <EnvelopeIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Mail</h1>
              <p className="text-xs text-muted-foreground">{gmailEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncEmails}
              disabled={isSyncing}
              className="btn-secondary text-sm"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={() => openCompose('new')}
              className="btn-primary text-sm"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Compose
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-border bg-muted/30 p-3">
          {/* Folders */}
          <nav className="space-y-1">
            {FOLDERS.map(folder => {
              const Icon = folder.icon
              const count = folder.id === 'inbox' ? stats?.unread
                : folder.id === 'sent' ? stats?.sent
                : folder.id === 'starred' ? stats?.starred
                : folder.id === 'followup' ? stats?.followup
                : undefined

              return (
                <button
                  key={folder.id}
                  onClick={() => { setActiveFolder(folder.id); setPage(1); setSelectedThread(null) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeFolder === folder.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1 text-left">{folder.label}</span>
                  {count !== undefined && count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeFolder === folder.id ? 'bg-primary text-white' : 'bg-muted-foreground/20'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Stats */}
          {stats && (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground px-3 mb-2 uppercase tracking-wider">Overview</p>
              <div className="space-y-2 px-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total threads</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">With prospects</span>
                  <span className="font-medium text-primary">{stats.withProspect}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Thread List */}
        <div className={`flex-1 flex flex-col border-r border-border ${selectedThread ? 'hidden lg:flex lg:w-96' : ''}`}>
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchThreads()}
                className="input-field pl-9 py-2 text-sm"
              />
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner-md text-primary"></div>
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <InboxIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No emails found</p>
                <button onClick={syncEmails} className="text-primary text-sm mt-2 hover:underline">
                  Sync from Gmail
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {threads.map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => loadThread(thread.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                      !thread.isRead ? 'bg-primary/5' : ''
                    } ${selectedThread?.id === thread.id ? 'bg-primary/10' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Star */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStar(thread.id, thread.isStarred) }}
                        className="mt-0.5 text-muted-foreground hover:text-yellow-500"
                      >
                        {thread.isStarred ? (
                          <StarIconSolid className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <StarIcon className="h-4 w-4" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-sm truncate ${!thread.isRead ? 'font-semibold' : ''}`}>
                            {getParticipantDisplay(thread)}
                          </span>
                          {thread.messageCount > 1 && (
                            <span className="text-xs text-muted-foreground">({thread.messageCount})</span>
                          )}
                          {thread.prospect && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Prospect
                            </span>
                          )}
                          {thread.needsFollowUp && (
                            <ClockIcon className="h-3.5 w-3.5 text-orange-500" />
                          )}
                        </div>
                        <p className={`text-sm truncate ${!thread.isRead ? 'font-medium' : 'text-foreground'}`}>
                          {thread.subject}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {thread.snippet}
                        </p>
                      </div>

                      {/* Date */}
                      <span className={`text-xs whitespace-nowrap ${!thread.isRead ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                        {formatDate(thread.lastMessageAt)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-xs"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Thread Detail */}
        {selectedThread && (
          <div className="flex-1 flex flex-col bg-background">
            {/* Thread Header */}
            <div className="flex-shrink-0 p-4 border-b border-border">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setSelectedThread(null)}
                  className="lg:hidden action-btn"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <h2 className="text-lg font-semibold flex-1 truncate">{selectedThread.subject}</h2>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => archiveThread(selectedThread.id)}
                  className="action-btn text-muted-foreground hover:text-foreground"
                  title="Archive"
                >
                  <ArchiveBoxIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleStar(selectedThread.id, selectedThread.isStarred)}
                  className="action-btn"
                  title="Star"
                >
                  {selectedThread.isStarred ? (
                    <StarIconSolid className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <StarIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => toggleFollowUp(selectedThread.id, selectedThread.needsFollowUp)}
                  className={`action-btn ${selectedThread.needsFollowUp ? 'text-orange-500' : 'text-muted-foreground'}`}
                  title="Mark for follow-up"
                >
                  <FlagIcon className="h-4 w-4" />
                </button>
                <div className="flex-1" />
                {selectedThread.prospect && (
                  <a
                    href={`/backlink-directory/prospects`}
                    className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded-full flex items-center gap-1"
                  >
                    <CheckCircleIcon className="h-3 w-3" />
                    {selectedThread.prospect.rootDomain}
                    {selectedThread.prospect.domainRating && (
                      <span className="font-medium">DR {selectedThread.prospect.domainRating}</span>
                    )}
                  </a>
                )}
                {selectedThread.linkDirectoryDomain && !selectedThread.prospect && (
                  <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full">
                    {selectedThread.linkDirectoryDomain.rootDomain}
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingThread ? (
                <div className="flex items-center justify-center py-12">
                  <div className="spinner-md text-primary"></div>
                </div>
              ) : (
                selectedThread.messages.map((message, index) => (
                  <div key={message.id} className="bg-muted/30 rounded-xl p-4">
                    {/* Message Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserCircleIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {message.fromName || message.fromEmail}
                          </span>
                          {message.direction === 'OUTBOUND' && (
                            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              Sent
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          To: {message.toEmails.join(', ')}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(message.sentAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Message Body */}
                    <div className="pl-13">
                      {message.bodyHtml ? (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap text-sm font-sans">
                          {message.bodyText || message.snippet}
                        </pre>
                      )}
                    </div>

                    {/* Reply button on last message */}
                    {index === selectedThread.messages.length - 1 && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <button
                          onClick={() => openCompose('reply', message)}
                          className="btn-secondary text-sm"
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4" />
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Empty state when no thread selected */}
        {!selectedThread && (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/20">
            <div className="text-center">
              <EnvelopeOpenIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Select an email to read</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold">
                {composeMode === 'reply' ? 'Reply' : 'New Message'}
              </h3>
              <button onClick={() => setShowCompose(false)} className="action-btn">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* To */}
              <div>
                <label className="input-label">To</label>
                <input
                  type="email"
                  value={composeData.to}
                  onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                  className="input-field"
                  placeholder="recipient@example.com"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="input-label">Subject</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                  className="input-field"
                  placeholder="Email subject..."
                />
              </div>

              {/* Template selector */}
              {composeMode === 'new' && templates.length > 0 && (
                <div>
                  <label className="input-label">Template (optional)</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select a template...</option>
                    <optgroup label="Outreach">
                      {templates.filter(t => t.category === 'outreach').map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Follow-up">
                      {templates.filter(t => t.category === 'followup').map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {/* Body */}
              <div>
                <label className="input-label">Message</label>
                <textarea
                  value={composeData.body}
                  onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                  className="input-field min-h-[200px]"
                  placeholder="Write your message... HTML is supported."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
              <button
                onClick={() => setShowCompose(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={sendEmail}
                disabled={isSending}
                className="btn-primary"
              >
                {isSending ? (
                  <>
                    <div className="spinner-sm border-white/30 border-t-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
