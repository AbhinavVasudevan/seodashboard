import { google, gmail_v1 } from 'googleapis'
import { prisma } from './prisma'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email'
]

// Types for Gmail operations
interface GmailMessageHeader {
  name: string
  value: string
}

interface ParsedEmail {
  id: string
  threadId: string
  subject: string
  from: string
  fromName: string | null
  to: string[]
  cc: string[]
  snippet: string
  bodyHtml: string | null
  bodyText: string | null
  date: Date
  labels: string[]
  hasAttachments: boolean
  attachmentCount: number
}

// Create OAuth2 client
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/gmail/callback`
  )
}

// Generate auth URL for user to authorize
export function getAuthUrl(state?: string) {
  const oauth2Client = createOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state
  })
}

// Exchange code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

// Get user's Gmail address from token
export async function getGmailAddress(accessToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const profile = await gmail.users.getProfile({ userId: 'me' })
  return profile.data.emailAddress
}

// Refresh token if expired
async function refreshTokenIfNeeded(credential: {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  userId: string
}) {
  if (new Date() < credential.expiresAt) {
    return credential.accessToken
  }

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: credential.refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()

  // Update stored credentials
  await prisma.gmailCredential.update({
    where: { userId: credential.userId },
    data: {
      accessToken: credentials.access_token!,
      expiresAt: new Date(credentials.expiry_date || Date.now() + 3600000)
    }
  })

  return credentials.access_token!
}

// Send email using Gmail API
export async function sendEmail({
  userId,
  to,
  subject,
  body,
  prospectId,
  templateId
}: {
  userId: string
  to: string
  subject: string
  body: string
  prospectId?: string
  templateId?: string
}) {
  // Get stored credentials
  const credential = await prisma.gmailCredential.findUnique({
    where: { userId }
  })

  if (!credential) {
    throw new Error('Gmail not connected. Please connect your Gmail account first.')
  }

  // Refresh token if needed
  const accessToken = await refreshTokenIfNeeded(credential)

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Create email message
  const message = [
    `From: ${credential.email}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    body
  ].join('\n')

  // Encode to base64url
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  try {
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    })

    // Log successful email
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        subject,
        body,
        prospectId,
        templateId,
        status: 'sent'
      }
    })

    return { success: true, messageId: response.data.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log failed email
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        subject,
        body,
        prospectId,
        templateId,
        status: 'failed',
        errorMessage
      }
    })

    throw error
  }
}

// Check if user has Gmail connected
export async function isGmailConnected(userId: string) {
  const credential = await prisma.gmailCredential.findUnique({
    where: { userId },
    select: { email: true, expiresAt: true }
  })

  return credential ? { connected: true, email: credential.email } : { connected: false }
}

// Disconnect Gmail
export async function disconnectGmail(userId: string) {
  await prisma.gmailCredential.delete({
    where: { userId }
  })
}

// ==========================================
// GMAIL READING FUNCTIONS
// ==========================================

// Helper to get authorized Gmail client
async function getAuthorizedGmailClient(userId: string) {
  const credential = await prisma.gmailCredential.findUnique({
    where: { userId }
  })

  if (!credential) {
    throw new Error('Gmail not connected')
  }

  const accessToken = await refreshTokenIfNeeded(credential)
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    email: credential.email
  }
}

// Parse email headers
function getHeader(headers: GmailMessageHeader[] | undefined, name: string): string {
  if (!headers) return ''
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase())
  return header?.value || ''
}

// Extract email address from "Name <email>" format
function parseEmailAddress(raw: string): { email: string; name: string | null } {
  const match = raw.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+@[^>]+)>?$/)
  if (match) {
    return { name: match[1]?.trim() || null, email: match[2].trim() }
  }
  return { name: null, email: raw.trim() }
}

// Parse multiple email addresses (comma separated)
function parseEmailAddresses(raw: string): string[] {
  if (!raw) return []
  return raw.split(',').map(e => parseEmailAddress(e.trim()).email).filter(Boolean)
}

// Get message body (HTML or plain text)
function getMessageBody(payload: gmail_v1.Schema$MessagePart | undefined): { html: string | null; text: string | null } {
  if (!payload) return { html: null, text: null }

  let html: string | null = null
  let text: string | null = null

  function processpart(part: gmail_v1.Schema$MessagePart) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      html = Buffer.from(part.body.data, 'base64').toString('utf-8')
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
      text = Buffer.from(part.body.data, 'base64').toString('utf-8')
    }

    if (part.parts) {
      part.parts.forEach(processpart)
    }
  }

  // Check if body is directly in payload
  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8')
    if (payload.mimeType === 'text/html') {
      html = decoded
    } else {
      text = decoded
    }
  }

  // Process parts recursively
  if (payload.parts) {
    payload.parts.forEach(processpart)
  }

  return { html, text }
}

// Count attachments
function countAttachments(payload: gmail_v1.Schema$MessagePart | undefined): number {
  if (!payload) return 0
  let count = 0

  function countParts(part: gmail_v1.Schema$MessagePart) {
    if (part.filename && part.filename.length > 0) {
      count++
    }
    if (part.parts) {
      part.parts.forEach(countParts)
    }
  }

  if (payload.parts) {
    payload.parts.forEach(countParts)
  }

  return count
}

// Parse Gmail message to our format
function parseGmailMessage(message: gmail_v1.Schema$Message): ParsedEmail {
  const headers = message.payload?.headers as GmailMessageHeader[] | undefined
  const { email: fromEmail, name: fromName } = parseEmailAddress(getHeader(headers, 'From'))
  const body = getMessageBody(message.payload)
  const attachmentCount = countAttachments(message.payload)

  return {
    id: message.id || '',
    threadId: message.threadId || '',
    subject: getHeader(headers, 'Subject') || '(No Subject)',
    from: fromEmail,
    fromName,
    to: parseEmailAddresses(getHeader(headers, 'To')),
    cc: parseEmailAddresses(getHeader(headers, 'Cc')),
    snippet: message.snippet || '',
    bodyHtml: body.html,
    bodyText: body.text,
    date: new Date(parseInt(message.internalDate || '0')),
    labels: message.labelIds || [],
    hasAttachments: attachmentCount > 0,
    attachmentCount
  }
}

// List messages from inbox
export async function listMessages({
  userId,
  maxResults = 50,
  pageToken,
  query,
  labelIds = ['INBOX']
}: {
  userId: string
  maxResults?: number
  pageToken?: string
  query?: string
  labelIds?: string[]
}) {
  const { gmail } = await getAuthorizedGmailClient(userId)

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    pageToken,
    q: query,
    labelIds
  })

  return {
    messages: response.data.messages || [],
    nextPageToken: response.data.nextPageToken,
    resultSizeEstimate: response.data.resultSizeEstimate
  }
}

// Get full message details
export async function getMessage(userId: string, messageId: string): Promise<ParsedEmail> {
  const { gmail } = await getAuthorizedGmailClient(userId)

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  })

  return parseGmailMessage(response.data)
}

// List threads
export async function listThreads({
  userId,
  maxResults = 50,
  pageToken,
  query,
  labelIds = ['INBOX']
}: {
  userId: string
  maxResults?: number
  pageToken?: string
  query?: string
  labelIds?: string[]
}) {
  const { gmail } = await getAuthorizedGmailClient(userId)

  const response = await gmail.users.threads.list({
    userId: 'me',
    maxResults,
    pageToken,
    q: query,
    labelIds
  })

  return {
    threads: response.data.threads || [],
    nextPageToken: response.data.nextPageToken,
    resultSizeEstimate: response.data.resultSizeEstimate
  }
}

// Get full thread with all messages
export async function getThread(userId: string, threadId: string): Promise<{
  id: string
  messages: ParsedEmail[]
  snippet: string
}> {
  const { gmail } = await getAuthorizedGmailClient(userId)

  const response = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full'
  })

  const messages = (response.data.messages || []).map(parseGmailMessage)

  return {
    id: response.data.id || '',
    messages,
    snippet: response.data.snippet || ''
  }
}

// Mark message as read
export async function markAsRead(userId: string, messageId: string) {
  const { gmail } = await getAuthorizedGmailClient(userId)

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD']
    }
  })
}

// Mark message as unread
export async function markAsUnread(userId: string, messageId: string) {
  const { gmail } = await getAuthorizedGmailClient(userId)

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: ['UNREAD']
    }
  })
}

// Archive message (remove from inbox)
export async function archiveMessage(userId: string, messageId: string) {
  const { gmail } = await getAuthorizedGmailClient(userId)

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['INBOX']
    }
  })
}

// Star/unstar message
export async function toggleStar(userId: string, messageId: string, starred: boolean) {
  const { gmail } = await getAuthorizedGmailClient(userId)

  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: starred
      ? { addLabelIds: ['STARRED'] }
      : { removeLabelIds: ['STARRED'] }
  })
}

// Send reply to a thread
export async function sendReply({
  userId,
  threadId,
  to,
  subject,
  body,
  inReplyTo,
  references
}: {
  userId: string
  threadId: string
  to: string
  subject: string
  body: string
  inReplyTo?: string
  references?: string
}) {
  const credential = await prisma.gmailCredential.findUnique({
    where: { userId }
  })

  if (!credential) {
    throw new Error('Gmail not connected')
  }

  const accessToken = await refreshTokenIfNeeded(credential)
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Build email with threading headers
  const headers = [
    `From: ${credential.email}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8'
  ]

  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`)
  }
  if (references) {
    headers.push(`References: ${references}`)
  }

  const message = [...headers, '', body].join('\n')

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      threadId
    }
  })

  return { success: true, messageId: response.data.id, threadId: response.data.threadId }
}

// Sync threads from Gmail to database
export async function syncEmailThreads({
  userId,
  maxResults = 100,
  query
}: {
  userId: string
  maxResults?: number
  query?: string
}) {
  const { gmail, email: userEmail } = await getAuthorizedGmailClient(userId)

  // Fetch threads
  const threadsResponse = await gmail.users.threads.list({
    userId: 'me',
    maxResults,
    q: query || 'in:inbox OR in:sent'
  })

  const threadIds = threadsResponse.data.threads || []
  const syncedThreads: string[] = []

  for (const threadRef of threadIds) {
    if (!threadRef.id) continue

    try {
      // Get full thread details
      const threadResponse = await gmail.users.threads.get({
        userId: 'me',
        id: threadRef.id,
        format: 'full'
      })

      const threadData = threadResponse.data
      if (!threadData.id || !threadData.messages?.length) continue

      const messages = threadData.messages.map(parseGmailMessage)
      const firstMessage = messages[0]
      const lastMessage = messages[messages.length - 1]

      // Collect all participants
      const participants = new Set<string>()
      messages.forEach(m => {
        participants.add(m.from)
        m.to.forEach(t => participants.add(t))
      })

      // Check if any message is unread
      const hasUnread = messages.some(m => m.labels.includes('UNREAD'))
      const unreadCount = messages.filter(m => m.labels.includes('UNREAD')).length

      // Try to match with prospect by email
      let prospectId: string | undefined
      let linkDirectoryDomainId: string | undefined

      const externalEmails = Array.from(participants).filter(e => e !== userEmail)
      for (const email of externalEmails) {
        // Try to find prospect by contact email
        const prospect = await prisma.backlinkProspect.findFirst({
          where: { contactEmail: email }
        })
        if (prospect) {
          prospectId = prospect.id
          break
        }

        // Try to find by domain
        const domain = email.split('@')[1]
        if (domain) {
          const linkDomain = await prisma.linkDirectoryDomain.findFirst({
            where: {
              OR: [
                { contactEmail: email },
                { supplierEmail: email },
                { rootDomain: { contains: domain } }
              ]
            }
          })
          if (linkDomain) {
            linkDirectoryDomainId = linkDomain.id
            break
          }
        }
      }

      // Upsert thread
      const thread = await prisma.emailThread.upsert({
        where: { gmailThreadId: threadData.id },
        create: {
          gmailThreadId: threadData.id,
          subject: firstMessage.subject,
          snippet: threadData.snippet || '',
          participants: Array.from(participants),
          isRead: !hasUnread,
          messageCount: messages.length,
          unreadCount,
          lastMessageAt: lastMessage.date,
          userId,
          prospectId,
          linkDirectoryDomainId
        },
        update: {
          snippet: threadData.snippet || '',
          participants: Array.from(participants),
          isRead: !hasUnread,
          messageCount: messages.length,
          unreadCount,
          lastMessageAt: lastMessage.date,
          prospectId,
          linkDirectoryDomainId
        }
      })

      // Upsert messages
      for (const msg of messages) {
        const direction = msg.from === userEmail ? 'OUTBOUND' : 'INBOUND'

        await prisma.emailMessage.upsert({
          where: { gmailMessageId: msg.id },
          create: {
            gmailMessageId: msg.id,
            threadId: thread.id,
            fromEmail: msg.from,
            fromName: msg.fromName,
            toEmails: msg.to,
            ccEmails: msg.cc,
            subject: msg.subject,
            snippet: msg.snippet,
            bodyHtml: msg.bodyHtml,
            bodyText: msg.bodyText,
            direction,
            isRead: !msg.labels.includes('UNREAD'),
            labels: msg.labels,
            hasAttachments: msg.hasAttachments,
            attachmentCount: msg.attachmentCount,
            sentAt: msg.date
          },
          update: {
            snippet: msg.snippet,
            bodyHtml: msg.bodyHtml,
            bodyText: msg.bodyText,
            isRead: !msg.labels.includes('UNREAD'),
            labels: msg.labels
          }
        })
      }

      syncedThreads.push(threadData.id)
    } catch (error) {
      console.error(`Error syncing thread ${threadRef.id}:`, error)
    }
  }

  return { syncedCount: syncedThreads.length, threadIds: syncedThreads }
}

// Get threads from database
export async function getStoredThreads({
  userId,
  folder = 'inbox',
  page = 1,
  limit = 50,
  search
}: {
  userId: string
  folder?: 'inbox' | 'sent' | 'starred' | 'followup' | 'all'
  page?: number
  limit?: number
  search?: string
}) {
  const where: Record<string, unknown> = { userId }

  // Apply folder filter
  if (folder === 'inbox') {
    where.isArchived = false
  } else if (folder === 'starred') {
    where.isStarred = true
  } else if (folder === 'followup') {
    where.needsFollowUp = true
  }

  // Apply search
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { snippet: { contains: search, mode: 'insensitive' } },
      { participants: { hasSome: [search] } }
    ]
  }

  const [threads, total] = await Promise.all([
    prisma.emailThread.findMany({
      where,
      include: {
        prospect: {
          select: {
            id: true,
            rootDomain: true,
            status: true,
            domainRating: true
          }
        },
        linkDirectoryDomain: {
          select: {
            id: true,
            rootDomain: true,
            currentPrice: true
          }
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          select: {
            fromEmail: true,
            fromName: true,
            direction: true,
            sentAt: true
          }
        }
      },
      orderBy: { lastMessageAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.emailThread.count({ where })
  ])

  return {
    threads,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  }
}

// Get thread with all messages from database
export async function getStoredThread(threadId: string) {
  const thread = await prisma.emailThread.findUnique({
    where: { id: threadId },
    include: {
      prospect: true,
      linkDirectoryDomain: true,
      messages: {
        orderBy: { sentAt: 'asc' }
      }
    }
  })

  return thread
}

// Toggle follow-up status
export async function toggleFollowUp(threadId: string, needsFollowUp: boolean, followUpDate?: Date) {
  return prisma.emailThread.update({
    where: { id: threadId },
    data: {
      needsFollowUp,
      followUpDate: followUpDate || null
    }
  })
}

// Link thread to prospect
export async function linkThreadToProspect(threadId: string, prospectId: string) {
  return prisma.emailThread.update({
    where: { id: threadId },
    data: { prospectId }
  })
}
