import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Parse the date and create date range for that day
    const startDate = new Date(dateStr)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(dateStr)
    endDate.setHours(23, 59, 59, 999)

    // Fetch all data in parallel
    const [apps, keywords, rankings] = await Promise.all([
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
    ])

    // Get unique countries from keywords
    const countries = Array.from(new Set(keywords.map(k => k.country))).sort()

    // Build keyword rows map
    const keywordRowsMap = new Map<string, { keyword: string; country: string; appRankings: Record<string, number | null> }>()

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
        row.appRankings[kw.appId] = null
      }
    })

    // Fill in rankings
    rankings.forEach((r) => {
      const key = `${r.keyword}|${r.country}`
      if (keywordRowsMap.has(key)) {
        const row = keywordRowsMap.get(key)!
        row.appRankings[r.appId] = r.rank
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
    })
  } catch (error) {
    console.error('Error fetching matrix data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}
