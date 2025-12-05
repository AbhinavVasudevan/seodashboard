import { google } from 'googleapis'
import { prisma } from './prisma'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
]

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
