import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// GET - Get all reports for an imposter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const reports = await prisma.imposterReport.findMany({
      where: { imposterId: id },
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { reportType: 'asc' },
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

// POST - Create or update a report for an imposter
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and SEO can manage reports
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SEO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      reportType,
      status,
      ticketNumber,
      contactEmail,
      notes,
      responseReceived,
      responseNotes,
    } = body

    // Validate reportType
    const validTypes = [
      'CLOUDFLARE',
      'HOSTING',
      'GOOGLE_LEGAL',
      'GOOGLE_COPYRIGHT',
      'DOMAIN_REGISTRAR',
      'DOMAIN_OWNER',
    ]
    if (!reportType || !validTypes.includes(reportType)) {
      return NextResponse.json({ error: 'Invalid reportType' }, { status: 400 })
    }

    // Validate status if provided
    const validStatuses = [
      'NOT_REPORTED',
      'PENDING',
      'IN_PROGRESS',
      'RESOLVED',
      'REJECTED',
      'NO_RESPONSE',
    ]
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Check if imposter exists
    const imposter = await prisma.imposter.findUnique({
      where: { id },
    })

    if (!imposter) {
      return NextResponse.json({ error: 'Imposter not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status

      // If marking as reported (not NOT_REPORTED), set reported info
      if (status !== 'NOT_REPORTED') {
        updateData.reportedById = session.user.id
        updateData.reportedAt = new Date()
      }
    }

    if (ticketNumber !== undefined) updateData.ticketNumber = ticketNumber
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail
    if (notes !== undefined) updateData.notes = notes

    if (responseReceived !== undefined) {
      updateData.responseReceived = responseReceived
      if (responseReceived) {
        updateData.responseAt = new Date()
      }
    }
    if (responseNotes !== undefined) updateData.responseNotes = responseNotes

    // Upsert the report
    const report = await prisma.imposterReport.upsert({
      where: {
        imposterId_reportType: {
          imposterId: id,
          reportType,
        },
      },
      update: updateData,
      create: {
        imposterId: id,
        reportType,
        status: status || 'NOT_REPORTED',
        reportedById: status && status !== 'NOT_REPORTED' ? session.user.id : null,
        reportedAt: status && status !== 'NOT_REPORTED' ? new Date() : null,
        ticketNumber,
        contactEmail,
        notes,
      },
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error managing report:', error)
    return NextResponse.json({ error: 'Failed to manage report' }, { status: 500 })
  }
}

// PUT - Update report (e.g., record follow-up)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and SEO can manage reports
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SEO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: imposterId } = await params
    const body = await request.json()
    const { reportId, addFollowUp, ...updateFields } = body

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Handle follow-up tracking
    if (addFollowUp) {
      updateData.lastFollowUpAt = new Date()
      updateData.followUpCount = { increment: 1 }
    }

    // Handle other field updates
    const allowedFields = [
      'status',
      'ticketNumber',
      'contactEmail',
      'notes',
      'responseReceived',
      'responseNotes',
    ]

    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        updateData[field] = updateFields[field]

        if (field === 'responseReceived' && updateFields[field]) {
          updateData.responseAt = new Date()
        }
      }
    }

    const report = await prisma.imposterReport.update({
      where: {
        id: reportId,
        imposterId, // Ensure the report belongs to this imposter
      },
      data: updateData,
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error updating report:', error)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}
