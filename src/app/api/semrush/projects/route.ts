import { NextResponse } from 'next/server';
import { fetchSEMRushProjects, fetchSEMRushCampaigns } from '@/lib/semrush-projects';

/**
 * GET /api/semrush/projects
 * Fetch all SEMRush projects with tracking campaigns
 */
export async function GET() {
  try {
    const projects = await fetchSEMRushProjects();

    // Fetch campaigns for each project to get more details
    const projectsWithCampaigns = await Promise.all(
      projects.map(async (project) => {
        try {
          const campaigns = await fetchSEMRushCampaigns(project.project_id);
          return {
            project_id: project.project_id,
            project_name: project.project_name,
            url: project.url,
            domain: extractDomain(project.url),
            campaigns: campaigns.map(c => ({
              id: c.id,
              country: c.location?.country_code || 'us',
              device: c.device,
              keywords_count: c.keywords_count
            }))
          };
        } catch {
          return {
            project_id: project.project_id,
            project_name: project.project_name,
            url: project.url,
            domain: extractDomain(project.url),
            campaigns: [],
            error: 'Failed to fetch campaigns'
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      projects: projectsWithCampaigns
    });
  } catch (error) {
    console.error('Error fetching SEMRush projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch SEMRush projects'
      },
      { status: 500 }
    );
  }
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace('www.', '');
  }
}
