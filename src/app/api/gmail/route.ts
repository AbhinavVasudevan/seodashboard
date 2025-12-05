import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getAuthUrl, isGmailConnected, disconnectGmail, sendEmail } from '@/lib/gmail'

// GET - Check Gmail connection status or get auth URL
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'auth-url') {
      // Return auth URL for connecting Gmail
      const authUrl = getAuthUrl(session.user.id)
      return NextResponse.json({ authUrl })
    }

    // Check connection status
    const status = await isGmailConnected(session.user.id)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Gmail status error:', error)
    return NextResponse.json({ error: 'Failed to check Gmail status' }, { status: 500 })
  }
}

// POST - Send email
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, subject, body: emailBody, prospectId, templateId } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      )
    }

    const result = await sendEmail({
      userId: session.user.id,
      to,
      subject,
      body: emailBody,
      prospectId,
      templateId
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Send email error:', error)
    const message = error instanceof Error ? error.message : 'Failed to send email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE - Disconnect Gmail
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await disconnectGmail(session.user.id)
    return NextResponse.json({ message: 'Gmail disconnected' })
  } catch (error) {
    console.error('Disconnect Gmail error:', error)
    return NextResponse.json({ error: 'Failed to disconnect Gmail' }, { status: 500 })
  }
}
