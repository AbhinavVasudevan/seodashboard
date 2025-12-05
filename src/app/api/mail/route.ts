import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import {
  syncEmailThreads,
  getStoredThreads,
  toggleFollowUp,
  linkThreadToProspect
} from '@/lib/gmail'
import { prisma } from '@/lib/prisma'

// GET - List threads or sync
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Sync action - fetch from Gmail and store in DB
    if (action === 'sync') {
      const maxResults = parseInt(searchParams.get('maxResults') || '100')
      const query = searchParams.get('query') || undefined

      const result = await syncEmailThreads({
        userId: session.user.id,
        maxResults,
        query
      })

      return NextResponse.json(result)
    }

    // Stats action - get mail stats
    if (action === 'stats') {
      const [total, unread, starred, followup, withProspect, sent] = await Promise.all([
        // Total inbox threads (with inbound messages, not archived)
        prisma.emailThread.count({
          where: {
            userId: session.user.id,
            isArchived: false,
            hasInbound: true
          }
        }),
        // Unread inbox threads
        prisma.emailThread.count({
          where: {
            userId: session.user.id,
            isArchived: false,
            isRead: false,
            hasInbound: true
          }
        }),
        prisma.emailThread.count({ where: { userId: session.user.id, isStarred: true } }),
        prisma.emailThread.count({ where: { userId: session.user.id, needsFollowUp: true } }),
        prisma.emailThread.count({ where: { userId: session.user.id, prospectId: { not: null } } }),
        // Sent threads (with outbound messages)
        prisma.emailThread.count({
          where: {
            userId: session.user.id,
            hasOutbound: true
          }
        })
      ])

      return NextResponse.json({ total, unread, starred, followup, withProspect, sent })
    }

    // Default: List threads from database
    const folder = (searchParams.get('folder') || 'inbox') as 'inbox' | 'sent' | 'starred' | 'followup' | 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || undefined

    const result = await getStoredThreads({
      userId: session.user.id,
      folder,
      page,
      limit,
      search
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Mail GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch mail' },
      { status: 500 }
    )
  }
}

// POST - Actions on threads (follow-up, link prospect, etc.)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, threadId, ...data } = body

    switch (action) {
      case 'toggleFollowUp': {
        const thread = await toggleFollowUp(
          threadId,
          data.needsFollowUp,
          data.followUpDate ? new Date(data.followUpDate) : undefined
        )
        return NextResponse.json(thread)
      }

      case 'linkProspect': {
        const thread = await linkThreadToProspect(threadId, data.prospectId)
        return NextResponse.json(thread)
      }

      case 'toggleStar': {
        const thread = await prisma.emailThread.update({
          where: { id: threadId },
          data: { isStarred: data.isStarred }
        })
        return NextResponse.json(thread)
      }

      case 'markRead': {
        const thread = await prisma.emailThread.update({
          where: { id: threadId },
          data: { isRead: true, unreadCount: 0 }
        })
        return NextResponse.json(thread)
      }

      case 'archive': {
        const thread = await prisma.emailThread.update({
          where: { id: threadId },
          data: { isArchived: true }
        })
        return NextResponse.json(thread)
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Mail POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform action' },
      { status: 500 }
    )
  }
}
