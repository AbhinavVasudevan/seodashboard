import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface SEMrushResponse {
  data: Array<{
    Ph: string;      // Keyword
    Po: number;      // Position
    Ur: string;      // URL
    Tr: number;      // Traffic
    Vr: number;      // Search Volume
    Nq: number;      // Keyword Difficulty
    Cp: number;      // CPC
    Co: number;      // Competition
    Tg: number;      // Trend
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { rankTrackerId } = await request.json();

    if (!rankTrackerId) {
      return NextResponse.json({ error: 'Rank tracker ID is required' }, { status: 400 });
    }

    // Get the rank tracker details
    const rankTracker = await prisma.rankTracker.findUnique({
      where: { id: rankTrackerId },
    });

    if (!rankTracker) {
      return NextResponse.json({ error: 'Rank tracker not found' }, { status: 404 });
    }

    // Get SEMrush API key from environment variables
    const semrushApiKey = process.env.SEMRUSH_API_KEY;
    if (!semrushApiKey) {
      return NextResponse.json({ error: 'SEMrush API key not configured' }, { status: 500 });
    }

    // Construct SEMrush API URL
    const baseUrl = 'https://api.semrush.com';
    const endpoint = '/analytics/v1';
    const params = new URLSearchParams({
      type: 'phrase_organic',
      key: semrushApiKey,
      phrase: rankTracker.keyword,
      database: rankTracker.country,
      export_columns: 'Ph,Po,Ur,Tr,Vr,Nq,Cp,Co,Tg',
      domain: rankTracker.domain,
    });

    const apiUrl = `${baseUrl}${endpoint}?${params}`;

    // Fetch data from SEMrush API
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SEMrush API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch data from SEMrush API' },
        { status: 500 }
      );
    }

    const responseText = await response.text();
    
    // Parse SEMrush response (it returns CSV-like format)
    const lines = responseText.trim().split('\n');
    if (lines.length < 2) {
      return NextResponse.json({ error: 'No data found for this keyword' }, { status: 404 });
    }

    // Skip header line and parse data
    const dataLine = lines[1];
    const columns = dataLine.split(';');
    
    if (columns.length < 9) {
      return NextResponse.json({ error: 'Invalid data format from SEMrush API' }, { status: 500 });
    }

    const rankingData = {
      position: parseInt(columns[1]) || 0,
      url: columns[2] || null,
      traffic: parseInt(columns[3]) || null,
      searchVolume: parseInt(columns[4]) || null,
      difficulty: parseInt(columns[5]) || null,
      cpc: parseFloat(columns[6]) || null,
      competition: parseFloat(columns[7]) || null,
      trend: parseInt(columns[8]) || null,
      date: new Date(),
    };

    // Save the ranking data to database
    const savedRanking = await prisma.rankTrackerHistory.create({
      data: {
        rankTrackerId,
        ...rankingData,
      },
    });

    // Update the last checked timestamp
    await prisma.rankTracker.update({
      where: { id: rankTrackerId },
      data: { lastChecked: new Date() },
    });

    return NextResponse.json({
      message: 'Ranking data fetched and saved successfully',
      data: savedRanking,
    });
  } catch (error) {
    console.error('Error fetching SEMrush data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Optional: Batch fetch for multiple rank trackers
export async function PUT(request: NextRequest) {
  try {
    const { rankTrackerIds } = await request.json();

    if (!rankTrackerIds || !Array.isArray(rankTrackerIds)) {
      return NextResponse.json(
        { error: 'Rank tracker IDs array is required' },
        { status: 400 }
      );
    }

    const results = [];
    const semrushApiKey = process.env.SEMRUSH_API_KEY;
    
    if (!semrushApiKey) {
      return NextResponse.json({ error: 'SEMrush API key not configured' }, { status: 500 });
    }

    for (const rankTrackerId of rankTrackerIds) {
      try {
        // Get the rank tracker details
        const rankTracker = await prisma.rankTracker.findUnique({
          where: { id: rankTrackerId },
        });

        if (!rankTracker) {
          results.push({ rankTrackerId, error: 'Rank tracker not found' });
          continue;
        }

        // Construct SEMrush API URL
        const baseUrl = 'https://api.semrush.com';
        const endpoint = '/analytics/v1';
        const params = new URLSearchParams({
          type: 'phrase_organic',
          key: semrushApiKey,
          phrase: rankTracker.keyword,
          database: rankTracker.country,
          export_columns: 'Ph,Po,Ur,Tr,Vr,Nq,Cp,Co,Tg',
          domain: rankTracker.domain,
        });

        const apiUrl = `${baseUrl}${endpoint}?${params}`;

        // Fetch data from SEMrush API
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          results.push({ rankTrackerId, error: 'SEMrush API request failed' });
          continue;
        }

        const responseText = await response.text();
        const lines = responseText.trim().split('\n');
        
        if (lines.length < 2) {
          results.push({ rankTrackerId, error: 'No data found' });
          continue;
        }

        // Parse data
        const dataLine = lines[1];
        const columns = dataLine.split(';');
        
        if (columns.length >= 9) {
          const rankingData = {
            position: parseInt(columns[1]) || 0,
            url: columns[2] || null,
            traffic: parseInt(columns[3]) || null,
            searchVolume: parseInt(columns[4]) || null,
            difficulty: parseInt(columns[5]) || null,
            cpc: parseFloat(columns[6]) || null,
            competition: parseFloat(columns[7]) || null,
            trend: parseInt(columns[8]) || null,
            date: new Date(),
          };

          // Save the ranking data to database
          const savedRanking = await prisma.rankTrackerHistory.create({
            data: {
              rankTrackerId,
              ...rankingData,
            },
          });

          // Update the last checked timestamp
          await prisma.rankTracker.update({
            where: { id: rankTrackerId },
            data: { lastChecked: new Date() },
          });

          results.push({ rankTrackerId, success: true, data: savedRanking });
        } else {
          results.push({ rankTrackerId, error: 'Invalid data format' });
        }
      } catch (error) {
        console.error(`Error processing rank tracker ${rankTrackerId}:`, error);
        results.push({ rankTrackerId, error: 'Processing failed' });
      }
    }

    return NextResponse.json({
      message: 'Batch fetch completed',
      results,
    });
  } catch (error) {
    console.error('Error in batch fetch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
