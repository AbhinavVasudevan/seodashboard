import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

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

    // Get categorized domains to exclude from backlink count
    const categorizedDomains = await prisma.blockedDomain.findMany({
      select: { domain: true, type: true }
    })

    const excludedDomains = categorizedDomains
      .filter(d => d.type === 'SPAM' || d.type === 'FREE_AFFILIATE' || d.type === 'FREE_LINK')
      .map(d => d.domain)

    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            apps: true,
            keywords: true,
            articles: true
          }
        }
      }
    })

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Get filtered backlink count
    const backlinkCount = await prisma.backlink.count({
      where: {
        brandId: id,
        ...(excludedDomains.length > 0 && {
          NOT: { rootDomain: { in: excludedDomains } }
        })
      }
    })

    return NextResponse.json({
      ...brand,
      _count: {
        ...brand._count,
        backlinks: backlinkCount
      }
    })
  } catch (error) {
    console.error('Error fetching brand:', error)
    return NextResponse.json({ error: 'Failed to fetch brand' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const brand = await prisma.brand.update({
      where: { id },
      data: {
        name: body.name,
        domain: body.domain,
        description: body.description
      }
    })

    return NextResponse.json(brand)
  } catch (error) {
    console.error('Error updating brand:', error)
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await prisma.brand.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting brand:', error)
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 })
  }
}
