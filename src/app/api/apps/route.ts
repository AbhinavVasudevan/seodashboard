import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    const apps = await prisma.app.findMany({
      where: brandId ? { brandId } : undefined,
      include: {
        brand: {
          select: {
            name: true,
          },
        },
        rankings: {
          orderBy: {
            date: 'desc',
          },
          take: 1,
        },
        _count: {
          select: {
            rankings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Fetch unique keyword counts for each app
    const appsWithStats = await Promise.all(
      apps.map(async (app) => {
        const uniqueKeywords = await prisma.appRanking.groupBy({
          by: ['keyword'],
          where: { appId: app.id },
        })
        return {
          ...app,
          uniqueKeywordCount: uniqueKeywords.length,
          lastRankingDate: app.rankings[0]?.date || null,
        }
      })
    )

    return NextResponse.json(appsWithStats)
  } catch (error) {
    console.error('Error fetching apps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch apps' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, platform, brandId } = body

    if (!name || !platform || !brandId) {
      return NextResponse.json(
        { error: 'Name, platform, and brandId are required' },
        { status: 400 }
      )
    }

    const app = await prisma.app.create({
      data: {
        name,
        platform: platform.toUpperCase(),
        brandId,
      },
    })

    return NextResponse.json(app, { status: 201 })
  } catch (error) {
    console.error('Error creating app:', error)
    return NextResponse.json(
      { error: 'Failed to create app' },
      { status: 500 }
    )
  }
}
