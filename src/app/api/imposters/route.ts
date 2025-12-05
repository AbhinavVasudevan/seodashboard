import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { extractDomain } from '@/lib/zyte'

// GET - List imposters with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (brandId) where.brandId = brandId
    if (status) where.status = status

    const imposters = await prisma.imposter.findMany({
      where,
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
        _count: {
          select: { reports: true },
        },
      },
      orderBy: [
        { status: 'asc' }, // SUSPECTED first
        { detectedAt: 'desc' },
      ],
    })

    return NextResponse.json(imposters)
  } catch (error) {
    console.error('Error fetching imposters:', error)
    return NextResponse.json({ error: 'Failed to fetch imposters' }, { status: 500 })
  }
}

// POST - Manually add an imposter
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and SEO can add imposters
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SEO') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { brandId, domain, fullUrl, notes } = body

    if (!brandId || !domain) {
      return NextResponse.json(
        { error: 'brandId and domain are required' },
        { status: 400 }
      )
    }

    // Normalize domain
    const normalizedDomain = extractDomain(domain.includes('://') ? domain : `https://${domain}`) || domain.toLowerCase().replace(/^www\./, '')

    // Check if brand exists
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    })

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Create or update the imposter
    const imposter = await prisma.imposter.upsert({
      where: {
        brandId_domain: {
          brandId,
          domain: normalizedDomain,
        },
      },
      update: {
        fullUrl: fullUrl || undefined,
        reviewNotes: notes,
      },
      create: {
        brandId,
        domain: normalizedDomain,
        fullUrl,
        source: 'MANUAL',
        status: 'CONFIRMED', // Manual additions are automatically confirmed
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        confirmedAt: new Date(),
        reviewNotes: notes,
      },
      include: {
        brand: {
          select: { id: true, name: true, domain: true },
        },
        reports: true,
      },
    })

    return NextResponse.json(imposter, { status: 201 })
  } catch (error) {
    console.error('Error adding imposter:', error)
    return NextResponse.json({ error: 'Failed to add imposter' }, { status: 500 })
  }
}
