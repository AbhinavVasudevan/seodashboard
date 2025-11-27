import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rankTrackerId = searchParams.get('rankTrackerId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!rankTrackerId) {
      return NextResponse.json({ error: 'Rank tracker ID is required' }, { status: 400 });
    }

    // Build the where clause for filtering
    const whereClause: any = {
      rankTrackerId,
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    const history = await prisma.rankTrackerHistory.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: limit,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching rank tracker history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST to get historical data for multiple rank trackers
export async function POST(request: NextRequest) {
  try {
    const { rankTrackerIds, startDate, endDate } = await request.json();

    if (!rankTrackerIds || !Array.isArray(rankTrackerIds)) {
      return NextResponse.json(
        { error: 'Rank tracker IDs array is required' },
        { status: 400 }
      );
    }

    // Build the where clause for filtering
    const whereClause: any = {
      rankTrackerId: { in: rankTrackerIds },
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    const history = await prisma.rankTrackerHistory.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        rankTracker: {
          select: {
            id: true,
            keyword: true,
            country: true,
            domain: true,
          },
        },
      },
    });

    // Group data by rank tracker ID
    const groupedData = history.reduce((acc: Record<string, typeof history>, item: any) => {
      if (!acc[item.rankTrackerId]) {
        acc[item.rankTrackerId] = [];
      }
      acc[item.rankTrackerId].push(item);
      return acc;
    }, {} as Record<string, typeof history>);

    return NextResponse.json(groupedData);
  } catch (error) {
    console.error('Error fetching multiple rank tracker history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET aggregated statistics for a rank tracker
export async function PUT(request: NextRequest) {
  try {
    const { rankTrackerId, startDate, endDate } = await request.json();

    if (!rankTrackerId) {
      return NextResponse.json({ error: 'Rank tracker ID is required' }, { status: 400 });
    }

    // Build the where clause for filtering
    const whereClause: any = {
      rankTrackerId,
    };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    // Get all historical data for the period
    const history = await prisma.rankTrackerHistory.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });

    if (history.length === 0) {
      return NextResponse.json({ error: 'No historical data found' }, { status: 404 });
    }

    // Calculate statistics
    const positions = history.map((h: any) => h.position).filter((p: number) => p > 0);
    const traffic = history.map((h: any) => h.traffic).filter((t: number | null) => t !== null);
    const searchVolumes = history.map((h: any) => h.searchVolume).filter((v: number | null) => v !== null);

    const stats: any = {
      totalRecords: history.length,
      averagePosition: positions.length > 0 ? 
        Math.round(positions.reduce((sum: number, p: number) => sum + p, 0) / positions.length) : null,
      bestPosition: positions.length > 0 ? Math.min(...positions) : null,
      worstPosition: positions.length > 0 ? Math.max(...positions) : null,
      currentPosition: history[history.length - 1]?.position || null,
      previousPosition: history.length > 1 ? history[history.length - 2]?.position : null,
      positionChange: history.length > 1 ? 
        (history[history.length - 1]?.position || 0) - (history[history.length - 2]?.position || 0) : null,
      averageTraffic: traffic.length > 0 ? 
        Math.round(traffic.reduce((sum: number, t: number | null) => sum + (t || 0), 0) / traffic.length) : null,
      averageSearchVolume: searchVolumes.length > 0 ? 
        Math.round(searchVolumes.reduce((sum: number, v: number | null) => sum + (v || 0), 0) / searchVolumes.length) : null,
      firstRecorded: history[0]?.date,
      lastRecorded: history[history.length - 1]?.date,
      daysTracked: history.length > 1 ? 
        Math.ceil((history[history.length - 1].date.getTime() - history[0].date.getTime()) / (1000 * 60 * 60 * 24)) : 1,
    };

    // Calculate trend (simple linear regression for position)
    if (positions.length > 1) {
      const n = positions.length;
      const sumX = (n * (n - 1)) / 2; // Sum of indices
      const sumY = positions.reduce((sum: number, p: number) => sum + p, 0);
      const sumXY = positions.reduce((sum: number, p: number, i: number) => sum + (i * p), 0);
      const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      stats.trend = slope > 0 ? 'improving' : slope < 0 ? 'declining' : 'stable';
    } else {
      stats.trend = 'insufficient_data';
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error calculating rank tracker statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
