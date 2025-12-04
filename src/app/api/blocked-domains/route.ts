import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { BlockedDomainType } from '@prisma/client'

// Valid domain types
const VALID_TYPES: BlockedDomainType[] = ['SPAM', 'FREE_AFFILIATE', 'FREE_LINK']

// GET - List all blocked domains with optional type filter
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type') as BlockedDomainType | null

    const where = typeFilter && VALID_TYPES.includes(typeFilter)
      ? { type: typeFilter }
      : {}

    const [blockedDomains, stats] = await Promise.all([
      prisma.blockedDomain.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          blockedBy: {
            select: { name: true, email: true }
          }
        }
      }),
      // Get counts by type
      prisma.blockedDomain.groupBy({
        by: ['type'],
        _count: true
      })
    ])

    const typeCounts = {
      SPAM: 0,
      FREE_AFFILIATE: 0,
      FREE_LINK: 0,
      total: 0
    }
    stats.forEach(s => {
      typeCounts[s.type] = s._count
      typeCounts.total += s._count
    })

    return NextResponse.json({
      domains: blockedDomains,
      stats: typeCounts
    })
  } catch (error) {
    console.error('Error fetching blocked domains:', error)
    return NextResponse.json({ error: 'Failed to fetch blocked domains' }, { status: 500 })
  }
}

// POST - Add a domain to the blocklist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and SEO can manage domains
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SEO') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { domain, type, reason } = body

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Validate type
    const domainType: BlockedDomainType = VALID_TYPES.includes(type) ? type : 'SPAM'

    // Normalize the domain (lowercase, remove protocol, trailing slashes)
    const normalizedDomain = domain
      .toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .replace(/\/.*$/, '')
      .trim()

    // Check if already exists
    const existing = await prisma.blockedDomain.findUnique({
      where: { domain: normalizedDomain }
    })

    if (existing) {
      // Update the type if it already exists
      const updated = await prisma.blockedDomain.update({
        where: { domain: normalizedDomain },
        data: {
          type: domainType,
          reason: reason || existing.reason
        },
        include: {
          blockedBy: {
            select: { name: true, email: true }
          }
        }
      })
      return NextResponse.json({ ...updated, updated: true })
    }

    const blockedDomain = await prisma.blockedDomain.create({
      data: {
        domain: normalizedDomain,
        type: domainType,
        reason: reason || null,
        blockedById: session.user.id
      },
      include: {
        blockedBy: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json(blockedDomain, { status: 201 })
  } catch (error) {
    console.error('Error managing domain:', error)
    return NextResponse.json({ error: 'Failed to manage domain' }, { status: 500 })
  }
}

// PUT - Update a domain's type or reason
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SEO') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { id, type, reason } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updateData: { type?: BlockedDomainType; reason?: string } = {}
    if (type && VALID_TYPES.includes(type)) {
      updateData.type = type
    }
    if (reason !== undefined) {
      updateData.reason = reason || null
    }

    const updated = await prisma.blockedDomain.update({
      where: { id },
      data: updateData,
      include: {
        blockedBy: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating domain:', error)
    return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 })
  }
}

// DELETE - Remove a domain from the list
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can remove domains
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can remove domains' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const domain = searchParams.get('domain')

    if (!id && !domain) {
      return NextResponse.json({ error: 'ID or domain is required' }, { status: 400 })
    }

    if (id) {
      await prisma.blockedDomain.delete({
        where: { id }
      })
    } else if (domain) {
      await prisma.blockedDomain.delete({
        where: { domain: domain.toLowerCase() }
      })
    }

    return NextResponse.json({ message: 'Domain removed successfully' })
  } catch (error) {
    console.error('Error removing domain:', error)
    return NextResponse.json({ error: 'Failed to remove domain' }, { status: 500 })
  }
}
