import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchSEMRushDataForDomain } from '@/lib/semrush-projects';

/**
 * POST /api/semrush/refresh-rankings
 * Refresh rankings from SEMRush for existing keywords
 * Only updates rankings that don't have manual entries for today
 *
 * Body: { brandId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandId } = body;

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId is required' },
        { status: 400 }
      );
    }

    // Get brand with its keywords
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        keywords: true
      }
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    if (!brand.domain) {
      return NextResponse.json(
        { success: false, error: 'Brand has no domain set' },
        { status: 400 }
      );
    }

    // Fetch fresh SEMRush data
    const { rankings, projectId, errors } = await fetchSEMRushDataForDomain(brand.domain);

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: `No SEMRush project found matching domain: ${brand.domain}`,
          errors
        },
        { status: 404 }
      );
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build lookup map from SEMRush data
    const semrushRankings = new Map<string, typeof rankings[0]>();
    for (const row of rankings) {
      const key = `${row.keyword.toLowerCase()}_${row.country.toLowerCase()}`;
      if (!semrushRankings.has(key) || (row.position !== null && semrushRankings.get(key)?.position === null)) {
        semrushRankings.set(key, row);
      }
    }

    let rankingsCreated = 0;
    let rankingsUpdated = 0;
    let rankingsSkipped = 0;

    // Process each existing keyword
    for (const keyword of brand.keywords) {
      const key = `${keyword.keyword.toLowerCase()}_${keyword.country.toLowerCase()}`;
      const semrushData = semrushRankings.get(key);

      if (!semrushData || semrushData.position === null) {
        rankingsSkipped++;
        continue;
      }

      // Check if there's already a ranking for today
      const existingRanking = await prisma.keywordRanking.findFirst({
        where: {
          keywordId: keyword.id,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      if (existingRanking) {
        // Update only if the existing ranking has no position (was empty/manual placeholder)
        // Otherwise skip to preserve manual entries
        if (existingRanking.position === 0 || existingRanking.position === null) {
          await prisma.keywordRanking.update({
            where: { id: existingRanking.id },
            data: {
              position: semrushData.position,
              url: semrushData.url,
              searchVolume: semrushData.search_volume,
              cpc: semrushData.cpc
            }
          });
          rankingsUpdated++;
        } else {
          rankingsSkipped++;
        }
      } else {
        // Create new ranking
        await prisma.keywordRanking.create({
          data: {
            keywordId: keyword.id,
            position: semrushData.position,
            url: semrushData.url,
            searchVolume: semrushData.search_volume,
            cpc: semrushData.cpc,
            date: today
          }
        });
        rankingsCreated++;
      }
    }

    // Update last sync time
    await prisma.brand.update({
      where: { id: brand.id },
      data: {
        semrushLastSync: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalKeywords: brand.keywords.length,
        semrushKeywordsFound: semrushRankings.size,
        rankingsCreated,
        rankingsUpdated,
        rankingsSkipped
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error refreshing rankings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh rankings'
      },
      { status: 500 }
    );
  }
}
