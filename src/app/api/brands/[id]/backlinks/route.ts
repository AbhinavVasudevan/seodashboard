import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch backlinks for a brand with pagination
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const showFreeAffiliates = searchParams.get('showFreeAffiliates') === 'true'
    const skip = (page - 1) * limit

    // Get categorized domains
    const categorizedDomains = await prisma.blockedDomain.findMany({
      select: { domain: true, type: true }
    })

    // Create maps for each type
    const spamDomains = new Set<string>()
    const freeAffiliateDomains = new Set<string>()
    const freeLinkDomains = new Set<string>()

    categorizedDomains.forEach(d => {
      if (d.type === 'SPAM') spamDomains.add(d.domain)
      else if (d.type === 'FREE_AFFILIATE') freeAffiliateDomains.add(d.domain)
      else if (d.type === 'FREE_LINK') freeLinkDomains.add(d.domain)
    })

    // Build list of domains to exclude
    // Always exclude SPAM, optionally exclude FREE_AFFILIATE
    const excludedDomains = Array.from(spamDomains)
    if (!showFreeAffiliates) {
      excludedDomains.push(...Array.from(freeAffiliateDomains))
    }

    // Build where clause with search and blocked domain filter
    const where = {
      brandId: id,
      // Exclude spam (and optionally free affiliates)
      ...(excludedDomains.length > 0 && {
        NOT: {
          rootDomain: { in: excludedDomains }
        }
      }),
      ...(search && {
        OR: [
          { rootDomain: { contains: search, mode: 'insensitive' as const } },
          { referringPageUrl: { contains: search, mode: 'insensitive' as const } },
          { targetUrl: { contains: search, mode: 'insensitive' as const } },
          { anchor: { contains: search, mode: 'insensitive' as const } },
          { referringPageTitle: { contains: search, mode: 'insensitive' as const } },
        ]
      })
    }

    const [backlinks, total, stats] = await Promise.all([
      prisma.backlink.findMany({
        where,
        orderBy: [
          { dr: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit,
        select: {
          id: true,
          rootDomain: true,
          referringPageUrl: true,
          referringPageTitle: true,
          dr: true,
          ur: true,
          domainTraffic: true,
          targetUrl: true,
          anchor: true,
          linkType: true,
          content: true,
          firstSeen: true,
          price: true
        }
      }),
      prisma.backlink.count({ where }),
      prisma.backlink.aggregate({
        where,
        _avg: { dr: true },
        _sum: { price: true }
      })
    ])

    // Add category tag to each backlink (free link or free affiliate if showing)
    const backlinksWithTags = backlinks.map(bl => ({
      ...bl,
      category: freeLinkDomains.has(bl.rootDomain)
        ? 'FREE_LINK'
        : freeAffiliateDomains.has(bl.rootDomain)
        ? 'FREE_AFFILIATE'
        : null
    }))

    // Count hidden backlinks by type
    const [spamCount, freeAffiliateCount] = await Promise.all([
      spamDomains.size > 0
        ? prisma.backlink.count({
            where: { brandId: id, rootDomain: { in: Array.from(spamDomains) } }
          })
        : 0,
      freeAffiliateDomains.size > 0
        ? prisma.backlink.count({
            where: { brandId: id, rootDomain: { in: Array.from(freeAffiliateDomains) } }
          })
        : 0
    ])

    return NextResponse.json({
      backlinks: backlinksWithTags,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      avgDR: Math.round(stats._avg.dr || 0),
      totalSpent: stats._sum.price || 0,
      hiddenCounts: {
        spam: spamCount,
        freeAffiliate: freeAffiliateCount,
        total: spamCount + (showFreeAffiliates ? 0 : freeAffiliateCount)
      }
    })
  } catch (error) {
    console.error('Error fetching backlinks:', error)
    return NextResponse.json({ error: 'Failed to fetch backlinks' }, { status: 500 })
  }
}

// POST - Create a new backlink
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      referringPageUrl,
      referringPageTitle,
      rootDomain,
      targetUrl,
      anchor,
      linkType,
      dr,
      ur,
      domainTraffic,
      content,
      platform,
      firstSeen,
      lastSeen,
      price,
      remarks
    } = body

    if (!referringPageUrl || !targetUrl) {
      return NextResponse.json(
        { error: 'referringPageUrl and targetUrl are required' },
        { status: 400 }
      )
    }

    const backlink = await prisma.backlink.create({
      data: {
        brandId: id,
        referringPageUrl,
        referringPageTitle: referringPageTitle || null,
        rootDomain,
        targetUrl,
        anchor: anchor || null,
        linkType: linkType || null,
        dr: dr || null,
        ur: ur || null,
        domainTraffic: domainTraffic || null,
        content: content || null,
        platform: platform || null,
        firstSeen: firstSeen || null,
        lastSeen: lastSeen || null,
        price: price || null,
        remarks: remarks || null
      }
    })

    return NextResponse.json(backlink, { status: 201 })
  } catch (error) {
    console.error('Error creating backlink:', error)
    return NextResponse.json({ error: 'Failed to create backlink' }, { status: 500 })
  }
}

// PUT - Update a backlink
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { id: backlinkId, ...updateData } = body

    if (!backlinkId) {
      return NextResponse.json({ error: 'Backlink ID is required' }, { status: 400 })
    }

    const backlink = await prisma.backlink.update({
      where: { id: backlinkId },
      data: {
        referringPageUrl: updateData.referringPageUrl,
        referringPageTitle: updateData.referringPageTitle || null,
        rootDomain: updateData.rootDomain,
        targetUrl: updateData.targetUrl,
        anchor: updateData.anchor || null,
        linkType: updateData.linkType || null,
        dr: updateData.dr || null,
        ur: updateData.ur || null,
        domainTraffic: updateData.domainTraffic || null,
        content: updateData.content || null,
        platform: updateData.platform || null,
        firstSeen: updateData.firstSeen || null,
        lastSeen: updateData.lastSeen || null,
        price: updateData.price || null,
        remarks: updateData.remarks || null
      }
    })

    return NextResponse.json(backlink)
  } catch (error) {
    console.error('Error updating backlink:', error)
    return NextResponse.json({ error: 'Failed to update backlink' }, { status: 500 })
  }
}

// DELETE - Delete a backlink
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.backlink.delete({ where: { id } })

    return NextResponse.json({ message: 'Backlink deleted successfully' })
  } catch (error) {
    console.error('Error deleting backlink:', error)
    return NextResponse.json({ error: 'Failed to delete backlink' }, { status: 500 })
  }
}
