import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import {
  searchGoogleMultiplePages,
  analyzeResultsForImposters,
} from '@/lib/zyte'

// POST - Start a new imposter scan for a brand
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and SEO can run scans
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SEO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { brandId, searchKeyword, geolocation = 'GB', pages = 10 } = body

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    // Get the brand details
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    })

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    if (!brand.domain) {
      return NextResponse.json(
        { error: 'Brand domain is required for imposter scanning' },
        { status: 400 }
      )
    }

    // Use provided searchKeyword or brand name
    const query = searchKeyword || brand.name

    // Create the scan record
    const scan = await prisma.imposterScan.create({
      data: {
        brandId,
        searchKeyword: query,
        geolocation,
        status: 'IN_PROGRESS',
      },
    })

    try {
      // Perform the search
      const searchResults = await searchGoogleMultiplePages(query, geolocation, pages)

      if (searchResults.errors.length > 0) {
        console.warn('Search had some errors:', searchResults.errors)
      }

      // Analyze results for potential imposters
      const potentialImposters = analyzeResultsForImposters(
        searchResults.results,
        brand.domain,
        brand.name
      )

      // Create imposter records for each potential imposter
      let newImpostersCount = 0
      for (const imposter of potentialImposters) {
        try {
          // Use upsert to handle duplicates gracefully
          await prisma.imposter.upsert({
            where: {
              brandId_domain: {
                brandId,
                domain: imposter.domain,
              },
            },
            update: {
              // Update with latest search data if already exists
              fullUrl: imposter.fullUrl,
              pageTitle: imposter.pageTitle,
              pageDescription: imposter.pageDescription,
              searchRank: imposter.searchRank,
              scanId: scan.id,
            },
            create: {
              brandId,
              scanId: scan.id,
              domain: imposter.domain,
              fullUrl: imposter.fullUrl,
              pageTitle: imposter.pageTitle,
              pageDescription: imposter.pageDescription,
              searchRank: imposter.searchRank,
              source: 'GOOGLE_SEARCH',
              status: 'SUSPECTED',
            },
          })
          newImpostersCount++
        } catch (err) {
          console.error(`Error saving imposter ${imposter.domain}:`, err)
        }
      }

      // Update scan with results
      const completedScan = await prisma.imposterScan.update({
        where: { id: scan.id },
        data: {
          status: 'COMPLETED',
          pagesScanned: searchResults.pagesScanned,
          totalResults: searchResults.totalResults,
          impostorsFound: potentialImposters.length,
          completedAt: new Date(),
        },
        include: {
          imposters: {
            orderBy: { searchRank: 'asc' },
          },
        },
      })

      return NextResponse.json({
        scan: completedScan,
        newImposters: newImpostersCount,
        searchErrors: searchResults.errors,
      })
    } catch (error) {
      // Mark scan as failed
      await prisma.imposterScan.update({
        where: { id: scan.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      })

      throw error
    }
  } catch (error) {
    console.error('Error running imposter scan:', error)
    return NextResponse.json(
      { error: 'Failed to run imposter scan' },
      { status: 500 }
    )
  }
}

// GET - Get scan history for a brand
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    const where = brandId ? { brandId } : {}

    const scans = await prisma.imposterScan.findMany({
      where,
      include: {
        brand: {
          select: { id: true, name: true, domain: true },
        },
        _count: {
          select: { imposters: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(scans)
  } catch (error) {
    console.error('Error fetching scans:', error)
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 })
  }
}
