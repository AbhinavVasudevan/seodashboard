import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all link directory domains with aggregated data
// This includes both explicit LinkDirectoryDomain entries AND domains from backlinks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const sortBy = searchParams.get('sortBy') || 'domainRating'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    // Get all spam domains to exclude
    const spamDomains = await prisma.blockedDomain.findMany({
      where: { type: 'SPAM' },
      select: { domain: true },
    })
    const spamDomainSet = new Set(spamDomains.map(d => d.domain.toLowerCase()))

    // 1. Fetch all LinkDirectoryDomain entries
    const directoryDomains = await prisma.linkDirectoryDomain.findMany({
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
    })

    // Create a set of domains already in the directory
    const directoryDomainSet = new Set(directoryDomains.map(d => d.rootDomain.toLowerCase()))

    // 2. Fetch all backlinks with their root domains (to find ones NOT in directory)
    const allBacklinks = await prisma.backlink.findMany({
      select: {
        id: true,
        rootDomain: true,
        brandId: true,
        price: true,
        dr: true,
        referringPageUrl: true,
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Group backlinks by rootDomain for domains NOT in directory
    const backlinksByDomain = new Map<string, typeof allBacklinks>()
    allBacklinks.forEach(backlink => {
      if (!backlink.rootDomain) return
      const domain = backlink.rootDomain.toLowerCase()
      // Only include if NOT already in the directory
      if (!directoryDomainSet.has(domain)) {
        const existing = backlinksByDomain.get(domain) || []
        existing.push(backlink)
        backlinksByDomain.set(domain, existing)
      }
    })

    // 3. Transform directory domains
    const transformedDirectoryDomains = directoryDomains
      .filter(d => !spamDomainSet.has(d.rootDomain.toLowerCase()))
      .map((domain) => {
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
          supplierName: domain.supplierName,
          supplierEmail: domain.supplierEmail,
          currentPrice: domain.currentPrice,
          currency: domain.currency,
          createdAt: domain.createdAt,
          updatedAt: domain.updatedAt,
          totalBacklinks: domain.backlinks.length,
          totalProspects: domain.prospects.length,
          totalSpent,
          brands: Array.from(brandMap.values()),
          hasLiveBacklinks: domain.backlinks.length > 0,
          isFromBacklinks: false, // Explicit directory entry
        }
      })

    // 4. Transform backlink-only domains (not in directory)
    const backlinksOnlyDomains = Array.from(backlinksByDomain.entries())
      .filter(([domain]) => !spamDomainSet.has(domain))
      .map(([rootDomain, backlinks]) => {
        const brandMap = new Map<string, { id: string; name: string; count: number }>()
        let totalSpent = 0
        let maxDr: number | null = null
        let exampleUrl: string | null = null

        backlinks.forEach((backlink) => {
          if (backlink.price) totalSpent += backlink.price
          if (backlink.dr !== null && (maxDr === null || backlink.dr > maxDr)) {
            maxDr = backlink.dr
          }
          if (!exampleUrl && backlink.referringPageUrl) {
            exampleUrl = backlink.referringPageUrl
          }
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
          id: `backlink-${rootDomain}`, // Virtual ID for backlink-only domains
          rootDomain,
          exampleUrl,
          domainRating: maxDr,
          domainTraffic: null,
          nofollow: false,
          contactedOn: null,
          contactMethod: null,
          contactEmail: null,
          contactFormUrl: null,
          remarks: null,
          supplierName: null,
          supplierEmail: null,
          currentPrice: null,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          totalBacklinks: backlinks.length,
          totalProspects: 0,
          totalSpent,
          brands: Array.from(brandMap.values()),
          hasLiveBacklinks: true,
          isFromBacklinks: true, // From backlinks, not in directory
        }
      })

    // 5. Combine all domains
    let allDomains = [...transformedDirectoryDomains, ...backlinksOnlyDomains]

    // 6. Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      allDomains = allDomains.filter(d =>
        d.rootDomain.toLowerCase().includes(searchLower) ||
        (d.exampleUrl && d.exampleUrl.toLowerCase().includes(searchLower)) ||
        (d.contactEmail && d.contactEmail.toLowerCase().includes(searchLower))
      )
    }

    // 7. Sort combined data
    allDomains.sort((a, b) => {
      let aVal: number | string | Date | null = null
      let bVal: number | string | Date | null = null

      switch (sortBy) {
        case 'domainRating':
          aVal = a.domainRating
          bVal = b.domainRating
          break
        case 'rootDomain':
          aVal = a.rootDomain
          bVal = b.rootDomain
          break
        case 'totalBacklinks':
          aVal = a.totalBacklinks
          bVal = b.totalBacklinks
          break
        case 'totalSpent':
          aVal = a.totalSpent
          bVal = b.totalSpent
          break
        case 'currentPrice':
          aVal = a.currentPrice
          bVal = b.currentPrice
          break
        default:
          aVal = a.domainRating
          bVal = b.domainRating
      }

      // Handle nulls - push them to the end
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      const numA = typeof aVal === 'number' ? aVal : 0
      const numB = typeof bVal === 'number' ? bVal : 0
      return sortOrder === 'asc' ? numA - numB : numB - numA
    })

    // 8. Apply pagination
    const total = allDomains.length
    const skip = (page - 1) * limit
    const paginatedDomains = allDomains.slice(skip, skip + limit)

    // 9. Calculate stats
    const totalDomains = allDomains.length
    const avgDr = allDomains.reduce((sum, d) => sum + (d.domainRating || 0), 0) / (totalDomains || 1)
    const contactedCount = allDomains.filter(d => d.contactedOn !== null).length
    const withBacklinksCount = allDomains.filter(d => d.hasLiveBacklinks).length

    return NextResponse.json({
      domains: paginatedDomains,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalDomains,
        avgDomainRating: Math.round(avgDr),
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
