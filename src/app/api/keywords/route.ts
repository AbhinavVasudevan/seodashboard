import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const appId = searchParams.get('appId')
    const country = searchParams.get('country')
    const type = searchParams.get('type') // 'organic' for brand keywords, 'app' for app keywords

    // Build where clause based on provided parameters
    const whereClause: any = {}

    // Filter by type if specified
    if (type === 'organic') {
      // Only return keywords linked to brands (organic SEO keywords)
      whereClause.brandId = { not: null }
    } else if (type === 'app') {
      // Only return keywords linked to apps (ASO keywords)
      whereClause.appId = { not: null }
    } else if (brandId && appId) {
      // If both are provided, use OR
      whereClause.OR = [
        { brandId },
        { appId }
      ]
    } else if (brandId) {
      whereClause.brandId = brandId
    } else if (appId) {
      whereClause.appId = appId
    }

    if (country) {
      whereClause.country = country
    }

    const keywords = await prisma.keyword.findMany({
      where: whereClause,
      include: {
        brand: {
          select: {
            name: true,
          },
        },
        app: {
          select: {
            name: true,
            platform: true,
          },
        },
        rankings: {
          orderBy: {
            date: 'desc',
          },
          take: 30, // Get last 30 days of rankings for history
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(keywords)
  } catch (error) {
    console.error('Error fetching keywords:', error)
    return NextResponse.json(
      { error: 'Failed to fetch keywords' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keyword, country, brandId, appId, traffic, iosSearchVolume, androidSearchVolume } = body

    if (!keyword || !country) {
      return NextResponse.json(
        { error: 'Keyword and country are required' },
        { status: 400 }
      )
    }

    if (!brandId && !appId) {
      return NextResponse.json(
        { error: 'Either brandId or appId is required' },
        { status: 400 }
      )
    }

    // Check if keyword already exists for this brand/app and country
    const existingKeyword = await prisma.keyword.findFirst({
      where: {
        keyword,
        country: country.toUpperCase(),
        ...(brandId ? { brandId } : { appId }),
      },
    })

    if (existingKeyword) {
      // Return existing keyword instead of error
      return NextResponse.json(existingKeyword, { status: 200 })
    }

    const newKeyword = await prisma.keyword.create({
      data: {
        keyword,
        country: country.toUpperCase(),
        brandId: brandId || null,
        appId: appId || null,
        traffic: traffic || null,
        iosSearchVolume: iosSearchVolume || null,
        androidSearchVolume: androidSearchVolume || null,
      },
    })

    return NextResponse.json(newKeyword, { status: 201 })
  } catch (error) {
    console.error('Error creating keyword:', error)
    return NextResponse.json(
      { error: 'Failed to create keyword' },
      { status: 500 }
    )
  }
}
