import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch single domain with all associated backlinks grouped by brand
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if this is a "virtual" domain (from backlinks only, not in LinkDirectoryDomain)
    if (id.startsWith('backlink-')) {
      const rootDomain = id.replace('backlink-', '')

      // Fetch backlinks directly by rootDomain
      const backlinks = await prisma.backlink.findMany({
        where: { rootDomain: { equals: rootDomain, mode: 'insensitive' } },
        select: {
          id: true,
          referringPageUrl: true,
          referringPageTitle: true,
          targetUrl: true,
          anchor: true,
          linkType: true,
          dr: true,
          ur: true,
          domainTraffic: true,
          content: true,
          firstSeen: true,
          publishDate: true,
          price: true,
          brandId: true,
          brand: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
        },
        orderBy: [
          { dr: 'desc' },
          { createdAt: 'desc' },
        ],
      })

      // Group backlinks by brand
      const backlinksByBrand = new Map<string, {
        brand: { id: string; name: string; domain: string | null };
        backlinks: typeof backlinks;
        totalSpent: number;
      }>()

      backlinks.forEach((backlink) => {
        const existing = backlinksByBrand.get(backlink.brandId)
        if (existing) {
          existing.backlinks.push(backlink)
          existing.totalSpent += backlink.price || 0
        } else {
          backlinksByBrand.set(backlink.brandId, {
            brand: backlink.brand,
            backlinks: [backlink],
            totalSpent: backlink.price || 0,
          })
        }
      })

      return NextResponse.json({
        id,
        rootDomain,
        currentPrice: null,
        supplierName: null,
        supplierEmail: null,
        priceHistory: [],
        backlinksByBrand: Array.from(backlinksByBrand.values()),
        stats: {
          totalBacklinks: backlinks.length,
          totalProspects: 0,
          totalBrands: backlinksByBrand.size,
          totalSpent: backlinks.reduce((sum, b) => sum + (b.price || 0), 0),
          avgDr: backlinks.length > 0
            ? Math.round(
                backlinks.reduce((sum, b) => sum + (b.dr || 0), 0) /
                  backlinks.length
              )
            : 0,
        },
      })
    }

    // Regular LinkDirectoryDomain lookup
    const domain = await prisma.linkDirectoryDomain.findUnique({
      where: { id },
      include: {
        backlinks: {
          select: {
            id: true,
            referringPageUrl: true,
            referringPageTitle: true,
            targetUrl: true,
            anchor: true,
            linkType: true,
            dr: true,
            ur: true,
            domainTraffic: true,
            content: true,
            firstSeen: true,
            publishDate: true,
            price: true,
            brandId: true,
            brand: {
              select: {
                id: true,
                name: true,
                domain: true,
              },
            },
          },
          orderBy: [
            { dr: 'desc' },
            { createdAt: 'desc' },
          ],
        },
        prospects: {
          include: {
            brandDeals: {
              include: {
                brand: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        priceHistory: {
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    })

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Group backlinks by brand
    const backlinksByBrand = new Map<string, {
      brand: { id: string; name: string; domain: string | null };
      backlinks: typeof domain.backlinks;
      totalSpent: number;
    }>()

    domain.backlinks.forEach((backlink) => {
      const existing = backlinksByBrand.get(backlink.brandId)
      if (existing) {
        existing.backlinks.push(backlink)
        existing.totalSpent += backlink.price || 0
      } else {
        backlinksByBrand.set(backlink.brandId, {
          brand: backlink.brand,
          backlinks: [backlink],
          totalSpent: backlink.price || 0,
        })
      }
    })

    return NextResponse.json({
      ...domain,
      backlinksByBrand: Array.from(backlinksByBrand.values()),
      stats: {
        totalBacklinks: domain.backlinks.length,
        totalProspects: domain.prospects.length,
        totalBrands: backlinksByBrand.size,
        totalSpent: domain.backlinks.reduce((sum, b) => sum + (b.price || 0), 0),
        avgDr: domain.backlinks.length > 0
          ? Math.round(
              domain.backlinks.reduce((sum, b) => sum + (b.dr || 0), 0) /
                domain.backlinks.length
            )
          : 0,
      },
    })
  } catch (error) {
    console.error('Error fetching domain details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch domain details' },
      { status: 500 }
    )
  }
}
