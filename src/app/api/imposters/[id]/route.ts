import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

// GET - Get a single imposter with all details
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

    const imposter = await prisma.imposter.findUnique({
      where: { id },
      include: {
        brand: {
          select: { id: true, name: true, domain: true },
        },
        scan: {
          select: { id: true, searchKeyword: true, createdAt: true },
        },
        reviewedBy: {
          select: { id: true, name: true, email: true },
        },
        reports: {
          include: {
            reportedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { reportType: 'asc' },
        },
      },
    })

    if (!imposter) {
      return NextResponse.json({ error: 'Imposter not found' }, { status: 404 })
    }

    return NextResponse.json(imposter)
  } catch (error) {
    console.error('Error fetching imposter:', error)
    return NextResponse.json({ error: 'Failed to fetch imposter' }, { status: 500 })
  }
}

// PUT - Update imposter status (confirm, mark as false positive, resolve)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and SEO can update imposters
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SEO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, reviewNotes } = body

    // Validate status
    const validStatuses = ['SUSPECTED', 'CONFIRMED', 'FALSE_POSITIVE', 'RESOLVED']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status

      // Track review info when status changes from SUSPECTED
      if (status !== 'SUSPECTED') {
        updateData.reviewedById = session.user.id
        updateData.reviewedAt = new Date()
      }

      // Set confirmedAt when confirming
      if (status === 'CONFIRMED') {
        updateData.confirmedAt = new Date()
      }

      // Set resolvedAt when resolving
      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date()
      }
    }

    if (reviewNotes !== undefined) {
      updateData.reviewNotes = reviewNotes
    }

    const imposter = await prisma.imposter.update({
      where: { id },
      data: updateData,
      include: {
        brand: {
          select: { id: true, name: true, domain: true },
        },
        reviewedBy: {
          select: { id: true, name: true, email: true },
        },
        reports: {
          orderBy: { reportType: 'asc' },
        },
      },
    })

    return NextResponse.json(imposter)
  } catch (error) {
    console.error('Error updating imposter:', error)
    return NextResponse.json({ error: 'Failed to update imposter' }, { status: 500 })
  }
}

// DELETE - Remove an imposter record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can delete imposters
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await prisma.imposter.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting imposter:', error)
    return NextResponse.json({ error: 'Failed to delete imposter' }, { status: 500 })
  }
}
