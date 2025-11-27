import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all rank trackers for an app
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');

    if (!appId) {
      return NextResponse.json({ error: 'App ID is required' }, { status: 400 });
    }

    const rankTrackers = await prisma.rankTracker.findMany({
      where: { appId },
      include: {
        rankings: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json(rankTrackers);
  } catch (error) {
    console.error('Error fetching rank trackers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new rank tracker
export async function POST(request: NextRequest) {
  try {
    const { appId, keyword, country, domain } = await request.json();

    if (!appId || !keyword || !country || !domain) {
      return NextResponse.json(
        { error: 'App ID, keyword, country, and domain are required' },
        { status: 400 }
      );
    }

    // Check if rank tracker already exists
    const existingTracker = await prisma.rankTracker.findUnique({
      where: {
        appId_keyword_country_domain: {
          appId,
          keyword,
          country,
          domain,
        },
      },
    });

    if (existingTracker) {
      return NextResponse.json(
        { error: 'Rank tracker for this keyword, country, and domain already exists' },
        { status: 400 }
      );
    }

    const rankTracker = await prisma.rankTracker.create({
      data: {
        appId,
        keyword,
        country,
        domain,
      },
      include: {
        rankings: true,
      },
    });

    return NextResponse.json(rankTracker);
  } catch (error) {
    console.error('Error creating rank tracker:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update rank tracker
export async function PUT(request: NextRequest) {
  try {
    const { id, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Rank tracker ID is required' }, { status: 400 });
    }

    const rankTracker = await prisma.rankTracker.update({
      where: { id },
      data: { isActive },
      include: {
        rankings: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json(rankTracker);
  } catch (error) {
    console.error('Error updating rank tracker:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE rank tracker
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Rank tracker ID is required' }, { status: 400 });
    }

    await prisma.rankTracker.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Rank tracker deleted successfully' });
  } catch (error) {
    console.error('Error deleting rank tracker:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
