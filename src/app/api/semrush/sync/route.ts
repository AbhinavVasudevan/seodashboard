import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchSEMRushDataForDomain } from '@/lib/semrush-projects';

/**
 * POST /api/semrush/sync
 * Sync a brand's keywords and rankings from SEMRush Position Tracking
 *
 * Body: { brandId: string }
 *
 * This will:
 * 1. Find the brand and its domain
 * 2. Match with SEMRush project by domain
 * 3. Import all keywords (create if not exists)
 * 4. Import rankings (only if no manual ranking exists for that date)
 * 5. Update brand with SEMRush project/campaign IDs
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

    // Get brand with its domain
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        keywords: {
          include: {
            rankings: {
              orderBy: { date: 'desc' },
              take: 1
            }
          }
        }
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
        { success: false, error: 'Brand has no domain set. Please add a domain to the brand first.' },
        { status: 400 }
      );
    }

    // Fetch SEMRush data for this domain
    const { rankings, projectId, campaignId, errors } = await fetchSEMRushDataForDomain(brand.domain);

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

    // Get today's date for ranking comparisons
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process results
    let keywordsCreated = 0;
    let keywordsUpdated = 0;
    let rankingsImported = 0;
    let rankingsSkipped = 0;

    // Group rankings by keyword+country for deduplication
    const keywordMap = new Map<string, typeof rankings[0]>();
    for (const row of rankings) {
      const key = `${row.keyword.toLowerCase()}_${row.country.toLowerCase()}`;
      // Keep the one with position data if possible
      if (!keywordMap.has(key) || (row.position !== null && keywordMap.get(key)?.position === null)) {
        keywordMap.set(key, row);
      }
    }

    // Import keywords and rankings
    for (const row of Array.from(keywordMap.values())) {
      // Find or create keyword
      let keyword = await prisma.keyword.findFirst({
        where: {
          brandId: brand.id,
          keyword: row.keyword,
          country: row.country.toUpperCase()
        },
        include: {
          rankings: {
            where: {
              date: {
                gte: today
              }
            }
          }
        }
      });

      if (!keyword) {
        // Create new keyword
        keyword = await prisma.keyword.create({
          data: {
            brandId: brand.id,
            keyword: row.keyword,
            country: row.country.toUpperCase()
          },
          include: {
            rankings: {
              where: {
                date: {
                  gte: today
                }
              }
            }
          }
        });
        keywordsCreated++;
      } else {
        keywordsUpdated++;
      }

      // Import ranking if no manual ranking exists for today
      const hasExistingRanking = keyword.rankings.length > 0;

      if (!hasExistingRanking && row.position !== null) {
        // Create new ranking
        await prisma.keywordRanking.create({
          data: {
            keywordId: keyword.id,
            position: row.position,
            url: row.url,
            searchVolume: row.search_volume,
            cpc: row.cpc,
            date: today
          }
        });
        rankingsImported++;
      } else if (hasExistingRanking) {
        rankingsSkipped++;
      }
    }

    // Update brand with SEMRush project/campaign IDs
    await prisma.brand.update({
      where: { id: brand.id },
      data: {
        semrushProjectId: String(projectId),
        semrushCampaignId: campaignId ? String(campaignId) : null,
        semrushLastSync: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        campaignId,
        keywordsCreated,
        keywordsUpdated,
        rankingsImported,
        rankingsSkipped,
        totalKeywords: keywordMap.size
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error syncing SEMRush data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync SEMRush data'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/semrush/sync?brandId=xxx
 * Check sync status for a brand
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId is required' },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        id: true,
        name: true,
        domain: true,
        semrushProjectId: true,
        semrushCampaignId: true,
        semrushLastSync: true,
        _count: {
          select: {
            keywords: true
          }
        }
      }
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        brand: brand.name,
        domain: brand.domain,
        semrushProjectId: brand.semrushProjectId,
        semrushCampaignId: brand.semrushCampaignId,
        lastSync: brand.semrushLastSync,
        keywordCount: brand._count.keywords,
        isLinked: !!brand.semrushProjectId
      }
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check sync status'
      },
      { status: 500 }
    );
  }
}
