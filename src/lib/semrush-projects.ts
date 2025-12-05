/**
 * SEMRush Position Tracking API Integration
 *
 * This module provides functions to:
 * 1. Fetch all SEMRush projects with "tracking" tool
 * 2. Fetch tracking campaigns for each project
 * 3. Fetch position tracking reports with keyword rankings
 */

const SEMRUSH_API_KEY = process.env.SEMRUSH_API_KEY;

// Types for SEMRush API responses
export interface SEMRushProject {
  project_id: number;
  project_name: string;
  url: string;
  tools: { tool: string }[];
}

export interface SEMRushCampaign {
  id: number;
  location: {
    country_code: string;
    region_name?: string;
  };
  device: string;
  keywords_count: number;
  domain: string;
}

export interface SEMRushRankingRow {
  project_id: number;
  project_name: string;
  campaign_id: number;
  domain: string;
  date: string;
  keyword: string;
  position: number | null;
  url: string | null;
  search_volume: number | null;
  cpc: number | null;
  country: string;
}

/**
 * Get today's date in YYYYMMDD format
 */
function getTodayFormatted(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace('www.', '');
  }
}

/**
 * Step 1: Fetch all SEMRush projects with "tracking" tool
 */
export async function fetchSEMRushProjects(): Promise<SEMRushProject[]> {
  if (!SEMRUSH_API_KEY) {
    throw new Error('SEMRUSH_API_KEY environment variable is not set');
  }

  const url = `https://api.semrush.com/management/v1/projects?key=${SEMRUSH_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch SEMRush projects: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Validate that response is an array
  if (!Array.isArray(data)) {
    console.error('SEMRush projects API returned non-array:', data);
    throw new Error(`SEMRush API error: ${data?.error || data?.message || 'Invalid response format'}`);
  }

  const projects: SEMRushProject[] = data;

  // Filter for projects that have "tracking" tool
  return projects.filter(project =>
    project.tools && project.tools.some(t => t.tool === 'tracking')
  );
}

/**
 * Step 2: Fetch tracking campaigns for a project
 */
export async function fetchSEMRushCampaigns(projectId: number): Promise<SEMRushCampaign[]> {
  if (!SEMRUSH_API_KEY) {
    throw new Error('SEMRUSH_API_KEY environment variable is not set');
  }

  const url = `https://api.semrush.com/management/v1/projects/${projectId}/tracking/campaigns?key=${SEMRUSH_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch campaigns for project ${projectId}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Validate that response is an array
  if (!Array.isArray(data)) {
    console.error(`SEMRush campaigns API returned non-array for project ${projectId}:`, data);
    throw new Error(`SEMRush API error: ${data?.error || data?.message || 'Invalid response format'}`);
  }

  return data;
}

/**
 * Step 3: Fetch position tracking report for a campaign
 *
 * The Position Tracking API returns data in a nested JSON structure:
 * {
 *   "data": [
 *     {
 *       "Ph": "keyword",
 *       "Nq": 1000,           // Search volume
 *       "Cp": 1.5,            // CPC
 *       "Dt": {               // Rankings by date
 *         "20250129": {
 *           "*.domain.com/*": 5
 *         }
 *       },
 *       "Lu": {               // Landing URLs by date
 *         "20250129": {
 *           "*.domain.com/*": "https://domain.com/page"
 *         }
 *       },
 *       "Fi": {               // First/latest position (fallback)
 *         "*.domain.com/*": 5
 *       }
 *     }
 *   ]
 * }
 */
export async function fetchPositionTrackingReport(
  campaignId: number,
  projectName: string,
  projectId: number,
  domain: string,
  country: string
): Promise<SEMRushRankingRow[]> {
  if (!SEMRUSH_API_KEY) {
    throw new Error('SEMRUSH_API_KEY environment variable is not set');
  }

  const today = getTodayFormatted();
  const url = `https://api.semrush.com/reports/v1/projects/${campaignId}/tracking/?key=${SEMRUSH_API_KEY}&action=report&type=tracking_position_organic&date_begin=${today}&date_end=${today}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch position tracking for campaign ${campaignId}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rows: SEMRushRankingRow[] = [];
  const cleanDomain = extractDomain(domain);

  // Handle case where data might be empty or malformed
  if (!data || !data.data || !Array.isArray(data.data)) {
    console.warn(`No data returned for campaign ${campaignId}`);
    return rows;
  }

  for (const item of data.data) {
    const keyword = item.Ph;
    const searchVolume = item.Nq || null;
    const cpc = item.Cp || null;

    // Try to get position and URL from the date-specific data
    let position: number | null = null;
    let landingUrl: string | null = null;

    // Build the URL mask pattern to look for
    // Common patterns: "*.domain.com/*", "domain.com/*", etc.
    const urlMaskPatterns = [
      `*.${cleanDomain}/*`,
      `${cleanDomain}/*`,
      `www.${cleanDomain}/*`,
      `*.${cleanDomain}`,
      cleanDomain
    ];

    // Try to get position from Dt (date-based rankings)
    if (item.Dt && item.Dt[today]) {
      const dateRankings = item.Dt[today];
      for (const pattern of urlMaskPatterns) {
        if (dateRankings[pattern] !== undefined) {
          position = dateRankings[pattern];
          break;
        }
      }
      // If no pattern matched, try to get any ranking
      if (position === null) {
        const keys = Object.keys(dateRankings);
        if (keys.length > 0) {
          position = dateRankings[keys[0]];
        }
      }
    }

    // Fallback to Fi (first/latest position)
    if (position === null && item.Fi) {
      for (const pattern of urlMaskPatterns) {
        if (item.Fi[pattern] !== undefined) {
          position = item.Fi[pattern];
          break;
        }
      }
      if (position === null) {
        const keys = Object.keys(item.Fi);
        if (keys.length > 0) {
          position = item.Fi[keys[0]];
        }
      }
    }

    // Try to get landing URL from Lu (landing URLs by date)
    if (item.Lu && item.Lu[today]) {
      const dateLandingUrls = item.Lu[today];
      for (const pattern of urlMaskPatterns) {
        if (dateLandingUrls[pattern]) {
          landingUrl = dateLandingUrls[pattern];
          break;
        }
      }
      if (!landingUrl) {
        const keys = Object.keys(dateLandingUrls);
        if (keys.length > 0) {
          landingUrl = dateLandingUrls[keys[0]];
        }
      }
    }

    rows.push({
      project_id: projectId,
      project_name: projectName,
      campaign_id: campaignId,
      domain: cleanDomain,
      date: today,
      keyword,
      position,
      url: landingUrl,
      search_volume: searchVolume,
      cpc,
      country
    });
  }

  return rows;
}

/**
 * Fetch all SEMRush data (projects, campaigns, rankings)
 * Returns all ranking rows and project info for matching
 */
export async function fetchAllSEMRushData(): Promise<{
  rankings: SEMRushRankingRow[];
  projects: Array<{
    project_id: number;
    project_name: string;
    domain: string;
    campaigns: SEMRushCampaign[];
  }>;
  errors: string[];
}> {
  const errors: string[] = [];
  const allRankings: SEMRushRankingRow[] = [];
  const projectsInfo: Array<{
    project_id: number;
    project_name: string;
    domain: string;
    campaigns: SEMRushCampaign[];
  }> = [];

  // Step 1: Fetch projects
  let projects: SEMRushProject[];
  try {
    projects = await fetchSEMRushProjects();
    console.log(`Found ${projects.length} SEMRush projects with tracking`);
  } catch (error) {
    const errorMsg = `Failed to fetch projects: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMsg);
    return { rankings: [], projects: [], errors };
  }

  // Step 2 & 3: For each project, fetch campaigns and rankings
  for (const project of projects) {
    const projectDomain = extractDomain(project.url);
    let campaigns: SEMRushCampaign[];

    try {
      campaigns = await fetchSEMRushCampaigns(project.project_id);
      console.log(`Project "${project.project_name}" has ${campaigns.length} campaigns`);
    } catch (error) {
      const errorMsg = `Failed to fetch campaigns for project ${project.project_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      continue;
    }

    projectsInfo.push({
      project_id: project.project_id,
      project_name: project.project_name,
      domain: projectDomain,
      campaigns
    });

    // Fetch rankings for each campaign
    for (const campaign of campaigns) {
      try {
        const countryCode = campaign.location?.country_code || 'us';
        const rankings = await fetchPositionTrackingReport(
          campaign.id,
          project.project_name,
          project.project_id,
          campaign.domain || projectDomain,
          countryCode
        );
        allRankings.push(...rankings);
        console.log(`Campaign ${campaign.id}: fetched ${rankings.length} keywords`);
      } catch (error) {
        const errorMsg = `Failed to fetch rankings for campaign ${campaign.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
      }
    }
  }

  return {
    rankings: allRankings,
    projects: projectsInfo,
    errors
  };
}

/**
 * Fetch SEMRush data for a specific domain
 * Used when syncing a single brand
 */
export async function fetchSEMRushDataForDomain(targetDomain: string): Promise<{
  rankings: SEMRushRankingRow[];
  projectId: number | null;
  campaignId: number | null;
  errors: string[];
}> {
  const errors: string[] = [];
  const cleanTargetDomain = extractDomain(targetDomain);

  // Fetch projects
  let projects: SEMRushProject[];
  try {
    projects = await fetchSEMRushProjects();
  } catch (error) {
    const errorMsg = `Failed to fetch projects: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return { rankings: [], projectId: null, campaignId: null, errors: [errorMsg] };
  }

  // Find matching project by domain
  const matchingProject = projects.find(p => {
    const projectDomain = extractDomain(p.url);
    return projectDomain === cleanTargetDomain ||
           projectDomain.includes(cleanTargetDomain) ||
           cleanTargetDomain.includes(projectDomain);
  });

  if (!matchingProject) {
    return {
      rankings: [],
      projectId: null,
      campaignId: null,
      errors: [`No SEMRush project found for domain: ${targetDomain}`]
    };
  }

  // Fetch campaigns for the matching project
  let campaigns: SEMRushCampaign[];
  try {
    campaigns = await fetchSEMRushCampaigns(matchingProject.project_id);
  } catch (error) {
    const errorMsg = `Failed to fetch campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return {
      rankings: [],
      projectId: matchingProject.project_id,
      campaignId: null,
      errors: [errorMsg]
    };
  }

  if (campaigns.length === 0) {
    return {
      rankings: [],
      projectId: matchingProject.project_id,
      campaignId: null,
      errors: ['No tracking campaigns found for this project']
    };
  }

  // Fetch rankings from the first campaign (primary)
  const primaryCampaign = campaigns[0];
  const allRankings: SEMRushRankingRow[] = [];

  for (const campaign of campaigns) {
    try {
      const countryCode = campaign.location?.country_code || 'us';
      const rankings = await fetchPositionTrackingReport(
        campaign.id,
        matchingProject.project_name,
        matchingProject.project_id,
        campaign.domain || extractDomain(matchingProject.url),
        countryCode
      );
      allRankings.push(...rankings);
    } catch (error) {
      errors.push(`Campaign ${campaign.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    rankings: allRankings,
    projectId: matchingProject.project_id,
    campaignId: primaryCampaign.id,
    errors
  };
}
