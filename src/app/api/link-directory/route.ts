import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all link directory domains with aggregated data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const sortBy = searchParams.get('sortBy') || 'domainRating'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    const skip = (page - 1) * limit

    // Get all spam domains to exclude
    const spamDomains = await prisma.blockedDomain.findMany({
      where: { type: 'SPAM' },
      select: { domain: true },
    })
    const spamDomainSet = new Set(spamDomains.map(d => d.domain.toLowerCase()))

    // Build where clause - exclude spam domains
    const baseWhere = {
      rootDomain: {
        notIn: Array.from(spamDomainSet),
      },
    }

    const where = search
      ? {
          AND: [
            baseWhere,
            {
              OR: [
                { rootDomain: { contains: search, mode: 'insensitive' as const } },
                { exampleUrl: { contains: search, mode: 'insensitive' as const } },
                { contactEmail: { contains: search, mode: 'insensitive' as const } },
              ],
            },
          ],
        }
      : baseWhere

    // Fetch domains with counts
    const [domains, total] = await Promise.all([
      prisma.linkDirectoryDomain.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          backlinks: {
            select: {
              id: true,
              brandId: true,
              price: true,
              brand: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          prospects: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      prisma.linkDirectoryDomain.count({ where }),
    ])

    // Transform data to include brand counts and spending
    const transformedDomains = domains.map((domain) => {
      // Get unique brands with backlinks from this domain
      const brandMap = new Map<string, { id: string; name: string; count: number }>()
      let totalSpent = 0
      domain.backlinks.forEach((backlink) => {
        if (backlink.price) totalSpent += backlink.price
        const existing = brandMap.get(backlink.brandId)
        if (existing) {
          existing.count++
        } else {
          brandMap.set(backlink.brandId, {
            id: backlink.brand.id,
            name: backlink.brand.name,
            count: 1,
          })
        }
      })

      return {
        id: domain.id,
        rootDomain: domain.rootDomain,
        exampleUrl: domain.exampleUrl,
        domainRating: domain.domainRating,
        domainTraffic: domain.domainTraffic,
        nofollow: domain.nofollow,
        contactedOn: domain.contactedOn,
        contactMethod: domain.contactMethod,
        contactEmail: domain.contactEmail,
        contactFormUrl: domain.contactFormUrl,
        remarks: domain.remarks,
        // Price/Supplier info
        supplierName: domain.supplierName,
        supplierEmail: domain.supplierEmail,
        currentPrice: domain.currentPrice,
        currency: domain.currency,
        createdAt: domain.createdAt,
        updatedAt: domain.updatedAt,
        // Aggregated data
        totalBacklinks: domain.backlinks.length,
        totalProspects: domain.prospects.length,
        totalSpent,
        brands: Array.from(brandMap.values()),
        hasLiveBacklinks: domain.backlinks.length > 0,
      }
    })

    // Calculate stats (excluding spam domains)
    const stats = await prisma.linkDirectoryDomain.aggregate({
      where: baseWhere,
      _count: { id: true },
      _avg: { domainRating: true },
    })

    const contactedCount = await prisma.linkDirectoryDomain.count({
      where: {
        ...baseWhere,
        contactedOn: { not: null },
      },
    })

    const withBacklinksCount = await prisma.linkDirectoryDomain.count({
      where: {
        ...baseWhere,
        backlinks: {
          some: {},
        },
      },
    })

    return NextResponse.json({
      domains: transformedDomains,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalDomains: stats._count.id,
        avgDomainRating: Math.round(stats._avg.domainRating || 0),
        contactedDomains: contactedCount,
        domainsWithBacklinks: withBacklinksCount,
      },
    })
  } catch (error) {
    console.error('Error fetching link directory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch link directory' },
      { status: 500 }
    )
  }
}

// POST - Create new link directory domain
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      rootDomain,
      exampleUrl,
      domainRating,
      domainTraffic,
      nofollow,
      contactedOn,
      contactMethod,
      contactEmail,
      contactFormUrl,
      remarks,
      supplierName,
      supplierEmail,
      currentPrice,
      currency,
    } = body

    if (!rootDomain) {
      return NextResponse.json(
        { error: 'Root domain is required' },
        { status: 400 }
      )
    }

    // Check if domain already exists
    const existing = await prisma.linkDirectoryDomain.findUnique({
      where: { rootDomain: rootDomain.toLowerCase() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Domain already exists in directory' },
        { status: 400 }
      )
    }

    const price = currentPrice ? parseFloat(currentPrice) : null

    const domain = await prisma.linkDirectoryDomain.create({
      data: {
        rootDomain: rootDomain.toLowerCase(),
        exampleUrl: exampleUrl || null,
        domainRating: domainRating ? parseInt(domainRating) : null,
        domainTraffic: domainTraffic ? parseInt(domainTraffic) : null,
        nofollow: nofollow || false,
        contactedOn: contactedOn ? new Date(contactedOn) : null,
        contactMethod: contactMethod || null,
        contactEmail: contactEmail || null,
        contactFormUrl: contactFormUrl || null,
        remarks: remarks || null,
        supplierName: supplierName || null,
        supplierEmail: supplierEmail || null,
        currentPrice: price,
        currency: currency || 'USD',
        // Create initial price history if price is set
        ...(price ? {
          priceHistory: {
            create: {
              price,
              notes: 'Initial price',
            },
          },
        } : {}),
      },
    })

    return NextResponse.json(domain, { status: 201 })
  } catch (error) {
    console.error('Error creating link directory domain:', error)
    return NextResponse.json(
      { error: 'Failed to create link directory domain' },
      { status: 500 }
    )
  }
}

// PUT - Update link directory domain
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, priceChangeNote, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      )
    }

    // Check if price is changing
    const newPrice = updateData.currentPrice !== undefined
      ? (updateData.currentPrice ? parseFloat(updateData.currentPrice) : null)
      : undefined

    let priceChanged = false
    if (newPrice !== undefined) {
      const existingDomain = await prisma.linkDirectoryDomain.findUnique({
        where: { id },
        select: { currentPrice: true },
      })
      priceChanged = existingDomain?.currentPrice !== newPrice && newPrice !== null
    }

    const domain = await prisma.linkDirectoryDomain.update({
      where: { id },
      data: {
        exampleUrl: updateData.exampleUrl || undefined,
        domainRating: updateData.domainRating !== undefined
          ? parseInt(updateData.domainRating)
          : undefined,
        domainTraffic: updateData.domainTraffic !== undefined
          ? parseInt(updateData.domainTraffic)
          : undefined,
        nofollow: updateData.nofollow !== undefined
          ? updateData.nofollow
          : undefined,
        contactedOn: updateData.contactedOn
          ? new Date(updateData.contactedOn)
          : updateData.contactedOn === null
            ? null
            : undefined,
        contactMethod: updateData.contactMethod !== undefined
          ? updateData.contactMethod
          : undefined,
        contactEmail: updateData.contactEmail !== undefined
          ? updateData.contactEmail
          : undefined,
        contactFormUrl: updateData.contactFormUrl !== undefined
          ? updateData.contactFormUrl
          : undefined,
        remarks: updateData.remarks !== undefined
          ? updateData.remarks
          : undefined,
        supplierName: updateData.supplierName !== undefined
          ? updateData.supplierName
          : undefined,
        supplierEmail: updateData.supplierEmail !== undefined
          ? updateData.supplierEmail
          : undefined,
        currentPrice: newPrice,
        currency: updateData.currency !== undefined
          ? updateData.currency
          : undefined,
      },
    })

    // Create price history record if price changed
    if (priceChanged && typeof newPrice === 'number') {
      await prisma.domainPriceHistory.create({
        data: {
          linkDirectoryDomainId: id,
          price: newPrice,
          notes: priceChangeNote || 'Price updated',
        },
      })
    }

    return NextResponse.json(domain)
  } catch (error) {
    console.error('Error updating link directory domain:', error)
    return NextResponse.json(
      { error: 'Failed to update link directory domain' },
      { status: 500 }
    )
  }
}

// DELETE - Delete link directory domain
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      )
    }

    // First, unlink any backlinks and prospects
    await prisma.backlink.updateMany({
      where: { linkDirectoryDomainId: id },
      data: { linkDirectoryDomainId: null },
    })

    await prisma.backlinkProspect.updateMany({
      where: { linkDirectoryDomainId: id },
      data: { linkDirectoryDomainId: null },
    })

    // Then delete the domain
    await prisma.linkDirectoryDomain.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Domain deleted successfully' })
  } catch (error) {
    console.error('Error deleting link directory domain:', error)
    return NextResponse.json(
      { error: 'Failed to delete link directory domain' },
      { status: 500 }
    )
  }
}
