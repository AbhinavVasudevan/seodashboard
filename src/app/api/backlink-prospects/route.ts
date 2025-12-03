import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all prospects with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const whereClause: Record<string, unknown> = {}

    if (status) {
      whereClause.status = status
    }

    if (search) {
      whereClause.OR = [
        { referringPageUrl: { contains: search, mode: 'insensitive' } },
        { rootDomain: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    const prospects = await prisma.backlinkProspect.findMany({
      where: whereClause,
      include: {
        brandDeals: {
          include: {
            brand: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(prospects)
  } catch (error) {
    console.error('Error fetching prospects:', error)
    return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 })
  }
}

// POST - Create a new prospect
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      referringPageUrl,
      rootDomain,
      domainRating,
      domainTraffic,
      nofollow,
      contactedOn,
      contactMethod,
      contactEmail,
      contactFormUrl,
      remarks,
      content,
      status,
      source
    } = body

    if (!referringPageUrl || !rootDomain) {
      return NextResponse.json(
        { error: 'referringPageUrl and rootDomain are required' },
        { status: 400 }
      )
    }

    // Check for duplicate
    const existing = await prisma.backlinkProspect.findUnique({
      where: { referringPageUrl }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Prospect with this URL already exists' },
        { status: 409 }
      )
    }

    const prospect = await prisma.backlinkProspect.create({
      data: {
        referringPageUrl,
        rootDomain,
        domainRating: domainRating ? parseInt(domainRating) : null,
        domainTraffic: domainTraffic ? parseInt(domainTraffic) : null,
        nofollow: nofollow || false,
        contactedOn: contactedOn ? new Date(contactedOn) : null,
        contactMethod: contactMethod || null,
        contactEmail: contactEmail || null,
        contactFormUrl: contactFormUrl || null,
        remarks: remarks || null,
        content: content || null,
        status: status || 'NOT_CONTACTED',
        source: source || 'manual'
      }
    })

    return NextResponse.json(prospect, { status: 201 })
  } catch (error) {
    console.error('Error creating prospect:', error)
    return NextResponse.json({ error: 'Failed to create prospect' }, { status: 500 })
  }
}

// PUT - Update a prospect
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Convert types
    if (updateData.domainRating) {
      updateData.domainRating = parseInt(updateData.domainRating)
    }
    if (updateData.domainTraffic) {
      updateData.domainTraffic = parseInt(updateData.domainTraffic)
    }
    if (updateData.contactedOn) {
      updateData.contactedOn = new Date(updateData.contactedOn)
    }

    const prospect = await prisma.backlinkProspect.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(prospect)
  } catch (error) {
    console.error('Error updating prospect:', error)
    return NextResponse.json({ error: 'Failed to update prospect' }, { status: 500 })
  }
}

// DELETE - Delete a prospect
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.backlinkProspect.delete({ where: { id } })

    return NextResponse.json({ message: 'Prospect deleted successfully' })
  } catch (error) {
    console.error('Error deleting prospect:', error)
    return NextResponse.json({ error: 'Failed to delete prospect' }, { status: 500 })
  }
}
