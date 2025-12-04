import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get brand with counts
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            apps: true,
            keywords: true,
            backlinks: true,
            articles: true
          }
        }
      }
    })

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Get article status breakdown
    const articleStatusCounts = await prisma.article.groupBy({
      by: ['status'],
      where: { brandId: id },
      _count: true
    })

    const articleStatusBreakdown = articleStatusCounts.map(s => ({
      status: s.status,
      count: s._count
    }))

    // Get recent articles
    const recentArticles = await prisma.article.findMany({
      where: { brandId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        topicTitle: true,
        status: true,
        createdAt: true,
        writtenBy: {
          select: { name: true }
        }
      }
    })

    // Get backlink stats
    const backlinkStats = await prisma.backlink.aggregate({
      where: { brandId: id },
      _avg: { dr: true },
      _sum: { price: true },
      _count: true
    })

    // Get recent backlinks
    const recentBacklinks = await prisma.backlink.findMany({
      where: { brandId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        rootDomain: true,
        dr: true,
        linkType: true,
        createdAt: true
      }
    })

    // Get top backlinks by DR
    const topBacklinks = await prisma.backlink.findMany({
      where: { brandId: id },
      orderBy: { dr: 'desc' },
      take: 5,
      select: {
        id: true,
        rootDomain: true,
        dr: true,
        linkType: true
      }
    })

    // Get apps with ranking counts
    const apps = await prisma.app.findMany({
      where: { brandId: id },
      include: {
        _count: {
          select: { rankings: true }
        }
      }
    })

    // Get keyword ranking changes (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const keywords = await prisma.keyword.findMany({
      where: { brandId: id },
      include: {
        rankings: {
          orderBy: { date: 'desc' },
          take: 2
        }
      }
    })

    let improvements = 0
    let drops = 0
    let stable = 0

    keywords.forEach(kw => {
      if (kw.rankings.length >= 2) {
        const current = kw.rankings[0].position
        const previous = kw.rankings[1].position
        if (current < previous) improvements++
        else if (current > previous) drops++
        else stable++
      }
    })

    // Get articles created this week/month
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [articlesThisWeek, articlesThisMonth] = await Promise.all([
      prisma.article.count({
        where: {
          brandId: id,
          createdAt: { gte: startOfWeek }
        }
      }),
      prisma.article.count({
        where: {
          brandId: id,
          createdAt: { gte: startOfMonth }
        }
      })
    ])

    // Get backlinks by link type
    const backlinksByType = await prisma.backlink.groupBy({
      by: ['linkType'],
      where: { brandId: id },
      _count: true
    })

    return NextResponse.json({
      brand: {
        id: brand.id,
        name: brand.name,
        domain: brand.domain,
        description: brand.description,
        semrushProjectId: brand.semrushProjectId,
        semrushLastSync: brand.semrushLastSync
      },
      counts: brand._count,
      articles: {
        statusBreakdown: articleStatusBreakdown,
        recent: recentArticles.map(a => ({
          id: a.id,
          title: a.topicTitle,
          status: a.status,
          writer: a.writtenBy?.name || 'Unassigned',
          date: a.createdAt
        })),
        thisWeek: articlesThisWeek,
        thisMonth: articlesThisMonth
      },
      backlinks: {
        avgDR: Math.round(backlinkStats._avg.dr || 0),
        totalSpent: backlinkStats._sum.price || 0,
        total: backlinkStats._count,
        recent: recentBacklinks,
        topByDR: topBacklinks,
        byType: backlinksByType.map(b => ({
          type: b.linkType || 'Unknown',
          count: b._count
        }))
      },
      apps: apps.map(app => ({
        id: app.id,
        name: app.name,
        platform: app.platform,
        rankingsCount: app._count.rankings
      })),
      keywords: {
        total: keywords.length,
        improvements,
        drops,
        stable
      }
    })
  } catch (error) {
    console.error('Error fetching brand dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch brand dashboard' }, { status: 500 })
  }
}
