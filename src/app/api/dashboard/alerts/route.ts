import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    // Get app rankings for today and yesterday to compare
    const todayRankings = await prisma.appRanking.findMany({
      where: {
        date: {
          gte: yesterday,
          lt: today,
        },
      },
      include: {
        app: {
          include: {
            brand: true,
          },
        },
      },
    })

    const yesterdayRankings = await prisma.appRanking.findMany({
      where: {
        date: {
          gte: twoDaysAgo,
          lt: yesterday,
        },
      },
      include: {
        app: {
          include: {
            brand: true,
          },
        },
      },
    })

    // Create a map for yesterday's rankings
    const yesterdayMap = new Map<string, number>()
    yesterdayRankings.forEach(r => {
      const key = `${r.appId}-${r.keyword}-${r.country}`
      yesterdayMap.set(key, r.rank)
    })

    // Calculate changes
    const rankingChanges: Array<{
      appName: string
      brandName: string
      keyword: string
      country: string
      platform: string
      previousRank: number | null
      currentRank: number
      change: number
    }> = []

    todayRankings.forEach(r => {
      const key = `${r.appId}-${r.keyword}-${r.country}`
      const previousRank = yesterdayMap.get(key)

      // Only compare when BOTH have actual rankings (not 0 which means "not ranked")
      if (previousRank !== undefined && previousRank > 0 && r.rank > 0) {
        const change = previousRank - r.rank // Positive = improved, negative = dropped
        if (change !== 0) {
          rankingChanges.push({
            appName: r.app.name,
            brandName: r.app.brand.name,
            keyword: r.keyword,
            country: r.country,
            platform: r.app.platform,
            previousRank,
            currentRank: r.rank,
            change,
          })
        }
      }
    })

    // Sort by change (drops first - negative changes)
    const sortedChanges = rankingChanges.sort((a, b) => a.change - b.change)

    // Get top drops (negative changes = rank went up numerically = worse)
    const topDrops = sortedChanges.filter(c => c.change < 0).slice(0, 10)

    // Get top improvements (positive changes = rank went down numerically = better)
    const topImprovements = sortedChanges.filter(c => c.change > 0).slice(0, 10)

    // Summary stats
    const totalDrops = sortedChanges.filter(c => c.change < 0).length
    const totalImprovements = sortedChanges.filter(c => c.change > 0).length
    const significantDrops = sortedChanges.filter(c => c.change <= -10).length
    const significantImprovements = sortedChanges.filter(c => c.change >= 10).length

    // Get keyword ranking changes (for SEO keywords, not app rankings)
    const keywordRankings = await prisma.keywordRanking.findMany({
      where: {
        createdAt: {
          gte: twoDaysAgo,
        },
      },
      include: {
        keyword: {
          include: {
            brand: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Group keyword rankings by keyword
    const keywordMap = new Map<string, Array<{ position: number; date: Date }>>()
    keywordRankings.forEach(r => {
      const key = `${r.keywordId}`
      if (!keywordMap.has(key)) {
        keywordMap.set(key, [])
      }
      keywordMap.get(key)!.push({ position: r.position, date: r.createdAt })
    })

    // Count total apps and keywords
    const totalApps = await prisma.app.count()
    const totalKeywords = await prisma.keyword.count()
    const totalBrands = await prisma.brand.count()

    return NextResponse.json({
      summary: {
        totalApps,
        totalKeywords,
        totalBrands,
        totalDrops,
        totalImprovements,
        significantDrops,
        significantImprovements,
      },
      topDrops,
      topImprovements,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching dashboard alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}
