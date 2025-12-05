import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth-options'

export async function GET() {
  try {
    // Get categorized domains to exclude from backlink counts
    const categorizedDomains = await prisma.blockedDomain.findMany({
      select: { domain: true, type: true }
    })

    const excludedDomains = categorizedDomains
      .filter(d => d.type === 'SPAM' || d.type === 'FREE_AFFILIATE' || d.type === 'FREE_LINK')
      .map(d => d.domain)

    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: {
            apps: true,
            keywords: true,
            articles: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get filtered backlink counts for each brand
    const brandsWithFilteredCounts = await Promise.all(
      brands.map(async (brand) => {
        const backlinkCount = await prisma.backlink.count({
          where: {
            brandId: brand.id,
            ...(excludedDomains.length > 0 && {
              NOT: { rootDomain: { in: excludedDomains } }
            })
          }
        })

        return {
          ...brand,
          _count: {
            ...brand._count,
            backlinks: backlinkCount
          }
        }
      })
    )

    return NextResponse.json(brandsWithFilteredCounts)
  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to create a brand.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, domain, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Brand name is required' },
        { status: 400 }
      )
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        domain,
        description,
        userId: session.user.id,
      },
    })

    return NextResponse.json(brand, { status: 201 })
  } catch (error) {
    console.error('Error creating brand:', error)
    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    )
  }
}
