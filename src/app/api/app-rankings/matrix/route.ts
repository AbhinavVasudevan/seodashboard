import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const comparePeriod = searchParams.get('compare') || '1' // 1, 7, or 30 days

    // Parse the date and create date range for that day
    const startDate = new Date(dateStr)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(dateStr)
    endDate.setHours(23, 59, 59, 999)

    // Calculate comparison date range based on period
    const daysBack = parseInt(comparePeriod) || 1
    const prevStartDate = new Date(startDate)
    prevStartDate.setDate(prevStartDate.getDate() - daysBack)
    const prevEndDate = new Date(prevStartDate)
    prevEndDate.setHours(23, 59, 59, 999)

    // Fetch all data in parallel (including previous day's rankings)
    const [apps, keywords, rankings, prevRankings] = await Promise.all([
      // Get all apps with their brands
      prisma.app.findMany({
        select: {
          id: true,
          name: true,
          platform: true,
          brand: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),

      // Get all keywords
      prisma.keyword.findMany({
        select: {
          id: true,
          keyword: true,
          country: true,
          appId: true,
        },
      }),

      // Get rankings for the selected date
      prisma.appRanking.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          appId: true,
          keyword: true,
          country: true,
          rank: true,
        },
      }),

      // Get rankings for the previous day
      prisma.appRanking.findMany({
        where: {
          date: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
        select: {
          appId: true,
          keyword: true,
          country: true,
          rank: true,
        },
      }),
    ])

    // Get unique countries from keywords
    const countries = Array.from(new Set(keywords.map(k => k.country))).sort()

    // Build previous rankings map for quick lookup
    const prevRankingsMap = new Map<string, number>()
    prevRankings.forEach((r) => {
      const key = `${r.appId}|${r.keyword}|${r.country}`
      prevRankingsMap.set(key, r.rank)
    })

    // Build keyword rows map with changes
    const keywordRowsMap = new Map<string, {
      keyword: string
      country: string
      appRankings: Record<string, { rank: number | null; prevRank: number | null; change: number | null }>
    }>()

    // Initialize from keywords
    keywords.forEach((kw) => {
      if (!kw.appId) return // Skip keywords without an app

      const key = `${kw.keyword}|${kw.country}`
      if (!keywordRowsMap.has(key)) {
        keywordRowsMap.set(key, {
          keyword: kw.keyword,
          country: kw.country,
          appRankings: {},
        })
      }
      // Initialize this app's ranking as null
      const row = keywordRowsMap.get(key)!
      if (!(kw.appId in row.appRankings)) {
        row.appRankings[kw.appId] = { rank: null, prevRank: null, change: null }
      }
    })

    // Fill in rankings with change calculations
    rankings.forEach((r) => {
      const key = `${r.keyword}|${r.country}`
      if (keywordRowsMap.has(key)) {
        const row = keywordRowsMap.get(key)!
        const prevKey = `${r.appId}|${r.keyword}|${r.country}`
        const prevRank = prevRankingsMap.get(prevKey) ?? null

        // Calculate change: positive = improved (rank decreased), negative = dropped (rank increased)
        // Only calculate if both ranks are valid (> 0, since 0 = not ranked)
        let change: number | null = null
        if (r.rank > 0 && prevRank !== null && prevRank > 0) {
          change = prevRank - r.rank // positive = improved, negative = dropped
        }

        row.appRankings[r.appId] = {
          rank: r.rank > 0 ? r.rank : null, // Convert 0 to null for display
          prevRank: prevRank !== null && prevRank > 0 ? prevRank : null,
          change
        }
      }
    })

    // Also fill in previous-only rankings (keywords that were ranked yesterday but not today)
    prevRankings.forEach((r) => {
      const key = `${r.keyword}|${r.country}`
      if (keywordRowsMap.has(key)) {
        const row = keywordRowsMap.get(key)!
        if (row.appRankings[r.appId] && row.appRankings[r.appId].rank === null && r.rank > 0) {
          row.appRankings[r.appId].prevRank = r.rank
          // Was ranked, now not ranked = dropped out
          row.appRankings[r.appId].change = null // Can't calculate numerical change
        }
      }
    })

    // Convert to sorted array
    const keywordRows = Array.from(keywordRowsMap.values()).sort((a, b) => {
      if (a.country !== b.country) return a.country.localeCompare(b.country)
      return a.keyword.localeCompare(b.keyword)
    })

    return NextResponse.json({
      apps,
      keywordRows,
      countries,
      date: dateStr,
      prevDate: prevStartDate.toISOString().split('T')[0],
      comparePeriod: daysBack,
    })
  } catch (error) {
    console.error('Error fetching matrix data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}
