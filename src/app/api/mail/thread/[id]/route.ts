import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getStoredThread, sendReply, getThread } from '@/lib/gmail'
import { prisma } from '@/lib/prisma'

// GET - Get thread with all messages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') // 'db' or 'gmail'

    if (source === 'gmail') {
      // Fetch directly from Gmail
      const thread = await getThread(session.user.id, id)
      return NextResponse.json(thread)
    }

    // Default: Get from database
    const thread = await getStoredThread(id)

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Mark as read
    if (!thread.isRead) {
      await prisma.emailThread.update({
        where: { id },
        data: { isRead: true, unreadCount: 0 }
      })
    }

    return NextResponse.json(thread)
  } catch (error) {
    console.error('Thread GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch thread' },
      { status: 500 }
    )
  }
}

// POST - Send reply to thread
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { to, subject, message, inReplyTo, references } = body

    // Get thread to find Gmail thread ID
    const thread = await prisma.emailThread.findUnique({
      where: { id },
      select: { gmailThreadId: true, prospectId: true }
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Send reply
    const result = await sendReply({
      userId: session.user.id,
      threadId: thread.gmailThreadId,
      to,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      body: message,
      inReplyTo,
      references
    })

    // Update prospect status if linked
    if (thread.prospectId) {
      await prisma.backlinkProspect.update({
        where: { id: thread.prospectId },
        data: {
          status: 'CONTACTED',
          contactedOn: new Date(),
          contactMethod: 'EMAIL'
        }
      })
    }

    // Log the email
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        subject,
        body: message,
        prospectId: thread.prospectId,
        status: 'sent'
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Thread POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send reply' },
      { status: 500 }
    )
  }
}

// PATCH - Update thread metadata
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const allowedFields = ['isStarred', 'isArchived', 'needsFollowUp', 'followUpDate', 'prospectId']
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const thread = await prisma.emailThread.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(thread)
  } catch (error) {
    console.error('Thread PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update thread' },
      { status: 500 }
    )
  }
}
