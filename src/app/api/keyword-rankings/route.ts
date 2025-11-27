import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keywordId = searchParams.get('keywordId')
    const brandId = searchParams.get('brandId')
    const limit = parseInt(searchParams.get('limit') || '30')

    let where: any = {}

    if (keywordId) {
      where.keywordId = keywordId
    } else if (brandId) {
      // Get rankings for all keywords of a brand
      where.keyword = {
        brandId: brandId
      }
    }

    const rankings = await prisma.keywordRanking.findMany({
      where,
      include: {
        keyword: {
          include: {
            brand: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
    })

    return NextResponse.json(rankings)
  } catch (error) {
    console.error('Error fetching keyword rankings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch keyword rankings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keywordId, position, url, traffic, searchVolume, difficulty, date } = body

    console.log('=== API RECEIVED ===')
    console.log('5. Received date:', date)
    console.log('6. Date type:', typeof date)

    if (!keywordId || position === undefined || position === null) {
      return NextResponse.json(
        { error: 'Keyword ID and position are required' },
        { status: 400 }
      )
    }

    // Parse the date or use today
    // If date is provided as YYYY-MM-DD string, append time to ensure consistent timezone handling
    let rankingDate: Date
    if (date) {
      // Append 'T00:00:00.000Z' to ensure UTC midnight interpretation
      const dateStr = date.includes('T') ? date : `${date}T00:00:00.000Z`
      rankingDate = new Date(dateStr)
    } else {
      rankingDate = new Date()
      rankingDate.setHours(0, 0, 0, 0)
    }

    console.log('7. After new Date(date):', rankingDate)
    console.log('8. ISO string:', rankingDate.toISOString())
    console.log('9. Date being saved to DB:', rankingDate)

    // Convert position to number, treating 0 as "Not Ranked"
    // Position 0 = NR (Not Ranked), Position 1-200 = actual ranking
    const positionValue = parseInt(position.toString())

    // Check if a ranking already exists for this keyword and date
    const existingRanking = await prisma.keywordRanking.findUnique({
      where: {
        keywordId_date: {
          keywordId,
          date: rankingDate,
        },
      },
    })

    let ranking

    if (existingRanking) {
      // Update existing ranking
      ranking = await prisma.keywordRanking.update({
        where: {
          id: existingRanking.id,
        },
        data: {
          position: positionValue,
          url,
          traffic,
          searchVolume,
          difficulty,
        },
      })
    } else {
      // Create new ranking
      ranking = await prisma.keywordRanking.create({
        data: {
          keywordId,
          position: positionValue,
          url,
          traffic,
          searchVolume,
          difficulty,
          date: rankingDate,
        },
      })
    }

    return NextResponse.json(ranking, { status: existingRanking ? 200 : 201 })
  } catch (error) {
    console.error('Error creating/updating keyword ranking:', error)
    return NextResponse.json(
      { error: 'Failed to save keyword ranking' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rankingId = searchParams.get('rankingId')

    if (!rankingId) {
      return NextResponse.json(
        { error: 'Ranking ID is required' },
        { status: 400 }
      )
    }

    await prisma.keywordRanking.delete({
      where: {
        id: rankingId,
      },
    })

    return NextResponse.json({ message: 'Ranking deleted successfully' })
  } catch (error) {
    console.error('Error deleting keyword ranking:', error)
    return NextResponse.json(
      { error: 'Failed to delete keyword ranking' },
      { status: 500 }
    )
  }
}
