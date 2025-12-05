import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { sendEmail, syncEmailThreads } from '@/lib/gmail'
import { prisma } from '@/lib/prisma'

// POST - Send new email (starts new thread)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, subject, message, prospectId, templateId } = body

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, message' },
        { status: 400 }
      )
    }

    // Send the email
    const result = await sendEmail({
      userId: session.user.id,
      to,
      subject,
      body: message,
      prospectId,
      templateId
    })

    // If prospect is linked, update their status
    if (prospectId) {
      await prisma.backlinkProspect.update({
        where: { id: prospectId },
        data: {
          status: 'CONTACTED',
          contactedOn: new Date(),
          contactMethod: 'EMAIL',
          contactEmail: to
        }
      })
    }

    // Trigger a sync to get the new thread in our database
    // Run this in background (don't await)
    syncEmailThreads({
      userId: session.user.id,
      maxResults: 10,
      query: `to:${to}`
    }).catch(err => console.error('Background sync error:', err))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
