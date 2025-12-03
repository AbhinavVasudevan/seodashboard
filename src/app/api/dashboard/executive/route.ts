import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    // Calculate date ranges
    const last7Days = new Date(today)
    last7Days.setDate(last7Days.getDate() - 7)

    const last30Days = new Date(today)
    last30Days.setDate(last30Days.getDate() - 30)

    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
    thisWeekStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

    // Fetch all data in parallel
    const [
      // Counts
      totalBrands,
      totalApps,
      totalKeywords,
      totalBacklinks,
      totalArticles,
      // Articles by status
      articlesByStatus,
      // Articles this week vs last week
      articlesThisWeek,
      articlesLastWeek,
      articlesThisMonth,
      articlesLastMonth,
      // Writer productivity (articles submitted this month)
      writerStats,
      // Pending articles
      pendingArticles,
      // Recent articles for timeline
      recentArticles,
      // Ranking trends (last 7 days)
      rankingTrendData,
      // Brand health (articles per brand)
      brandHealth,
      // Backlink deals
      backlinkDealsStats,
    ] = await Promise.all([
      // Basic counts
      prisma.brand.count(),
      prisma.app.count(),
      prisma.keyword.count(),
      prisma.backlink.count(),
      prisma.article.count(),

      // Articles by status
      prisma.article.groupBy({
        by: ['status'],
        _count: { status: true },
      }),

      // Articles this week
      prisma.article.count({
        where: { createdAt: { gte: thisWeekStart } },
      }),

      // Articles last week
      prisma.article.count({
        where: {
          createdAt: { gte: lastWeekStart, lt: thisWeekStart },
        },
      }),

      // Articles this month
      prisma.article.count({
        where: { createdAt: { gte: thisMonthStart } },
      }),

      // Articles last month
      prisma.article.count({
        where: {
          createdAt: { gte: lastMonthStart, lt: thisMonthStart },
        },
      }),

      // Writer productivity
      prisma.article.groupBy({
        by: ['writerId'],
        where: {
          writerId: { not: null },
          createdAt: { gte: last30Days },
        },
        _count: { id: true },
      }),

      // Pending articles (not yet published)
      prisma.article.count({
        where: {
          status: { in: ['SUBMITTED', 'ACCEPTED', 'SENT_TO_DEV', 'UNPUBLISHED'] },
        },
      }),

      // Recent articles with writer info
      prisma.article.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          topicTitle: true,
          status: true,
          createdAt: true,
          writtenBy: { select: { name: true, email: true } },
          brand: { select: { name: true } },
        },
      }),

      // Ranking trends - get daily aggregates for last 7 days
      prisma.$queryRaw<Array<{ date: Date; improvements: bigint; drops: bigint }>>`
        WITH daily_changes AS (
          SELECT
            DATE(ar1.date) as check_date,
            ar1."appId",
            ar1.keyword,
            ar1.country,
            ar1.rank as current_rank,
            (
              SELECT ar2.rank
              FROM app_rankings ar2
              WHERE ar2."appId" = ar1."appId"
                AND ar2.keyword = ar1.keyword
                AND ar2.country = ar1.country
                AND DATE(ar2.date) = DATE(ar1.date) - INTERVAL '1 day'
              LIMIT 1
            ) as prev_rank
          FROM app_rankings ar1
          WHERE ar1.date >= ${last7Days}
            AND ar1.rank > 0
        )
        SELECT
          check_date as date,
          COUNT(CASE WHEN prev_rank > current_rank AND prev_rank > 0 THEN 1 END) as improvements,
          COUNT(CASE WHEN prev_rank < current_rank AND prev_rank > 0 THEN 1 END) as drops
        FROM daily_changes
        WHERE prev_rank IS NOT NULL
        GROUP BY check_date
        ORDER BY check_date
      `,

      // Brand health - articles and backlinks per brand
      prisma.brand.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              articles: true,
              apps: true,
              backlinks: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),

      // Backlink deals stats
      prisma.brandBacklinkDeal.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ])

    // Get writer names
    const writerIds = writerStats.map(w => w.writerId).filter(Boolean) as string[]
    const writers = await prisma.user.findMany({
      where: { id: { in: writerIds } },
      select: { id: true, name: true, email: true },
    })
    const writerMap = new Map(writers.map(w => [w.id, w]))

    // Format writer productivity
    const writerProductivity = writerStats
      .filter(w => w.writerId)
      .map(w => ({
        writer: writerMap.get(w.writerId!)?.name || writerMap.get(w.writerId!)?.email || 'Unknown',
        articles: w._count.id,
      }))
      .sort((a, b) => b.articles - a.articles)

    // Format article status breakdown
    const statusOrder = ['SUBMITTED', 'ACCEPTED', 'SENT_TO_DEV', 'UNPUBLISHED', 'PUBLISHED', 'LIVE', 'REJECTED']
    const articleStatusBreakdown = statusOrder.map(status => ({
      status,
      count: articlesByStatus.find(s => s.status === status)?._count.status || 0,
    }))

    // Calculate weekly article production (last 8 weeks)
    const weeklyProduction: Array<{ week: string; count: number }> = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + (i * 7)))
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const count = await prisma.article.count({
        where: {
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      })

      const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      weeklyProduction.push({ week: weekLabel, count })
    }

    // Format ranking trends
    const rankingTrends = rankingTrendData.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      improvements: Number(d.improvements),
      drops: Number(d.drops),
    }))

    // Calculate growth percentages
    const articleGrowthWeek = articlesLastWeek > 0
      ? Math.round(((articlesThisWeek - articlesLastWeek) / articlesLastWeek) * 100)
      : 100
    const articleGrowthMonth = articlesLastMonth > 0
      ? Math.round(((articlesThisMonth - articlesLastMonth) / articlesLastMonth) * 100)
      : 100

    // Format brand health
    const brandHealthData = brandHealth.map(b => ({
      name: b.name,
      articles: b._count.articles,
      apps: b._count.apps,
      backlinks: b._count.backlinks,
    })).sort((a, b) => b.articles - a.articles)

    // Format backlink deals
    const backlinkDeals = {
      pending: backlinkDealsStats.find(s => s.status === 'PENDING')?._count.status || 0,
      approved: backlinkDealsStats.find(s => s.status === 'APPROVED')?._count.status || 0,
      live: backlinkDealsStats.find(s => s.status === 'LIVE')?._count.status || 0,
      total: backlinkDealsStats.reduce((sum, s) => sum + s._count.status, 0),
    }

    return NextResponse.json({
      overview: {
        totalBrands,
        totalApps,
        totalKeywords,
        totalBacklinks,
        totalArticles,
        pendingArticles,
      },
      articles: {
        thisWeek: articlesThisWeek,
        lastWeek: articlesLastWeek,
        thisMonth: articlesThisMonth,
        lastMonth: articlesLastMonth,
        growthWeek: articleGrowthWeek,
        growthMonth: articleGrowthMonth,
        statusBreakdown: articleStatusBreakdown,
        weeklyProduction,
      },
      writers: {
        productivity: writerProductivity,
        totalWriters: writerProductivity.length,
      },
      rankings: {
        trends: rankingTrends,
      },
      brands: {
        health: brandHealthData,
      },
      backlinks: {
        deals: backlinkDeals,
      },
      recentArticles: recentArticles.map(a => ({
        id: a.id,
        title: a.topicTitle,
        status: a.status,
        writer: a.writtenBy?.name || a.writtenBy?.email || 'Unassigned',
        brand: a.brand.name,
        date: a.createdAt.toISOString(),
      })),
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching executive dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
