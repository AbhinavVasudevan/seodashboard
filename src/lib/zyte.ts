// Zyte API integration for SERP scraping
// Used for imposter detection by searching Google for brand keywords

const ZYTE_API_KEY = process.env.ZYTE_API_KEY || '';
const ZYTE_API_URL = 'https://api.zyte.com/v1/extract';

export interface ZyteSerpResult {
  name: string;
  description: string;
  url: string;
  rank: number;
  displayedUrlText: string;
}

export interface ZyteSerpResponse {
  organicResults: ZyteSerpResult[];
  url: string;
  pageNumber: number;
  metadata: {
    displayedQuery: string;
    searchedQuery: string;
    totalOrganicResults: number;
    dateDownloaded: string;
  };
}

export interface SerpSearchOptions {
  query: string;
  geolocation?: string;
  pages?: number; // Number of pages to fetch (1-10)
}

/**
 * Extract root domain from a URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Check if a domain might be an imposter of the original brand domain
 * Uses various heuristics to detect similar/lookalike domains
 */
export function isPotentialImposter(
  candidateDomain: string,
  originalDomain: string,
  brandName: string
): boolean {
  const candidate = candidateDomain.toLowerCase();
  const original = originalDomain.toLowerCase();
  const brand = brandName.toLowerCase().replace(/\s+/g, '');

  // Skip if it's the exact same domain
  if (candidate === original) return false;

  // Skip common legitimate platforms
  const legitimatePlatforms = [
    'google.com', 'google.co.uk', 'apple.com', 'apps.apple.com',
    'play.google.com', 'youtube.com', 'facebook.com', 'twitter.com',
    'instagram.com', 'linkedin.com', 'trustpilot.com', 'uk.trustpilot.com',
    'racingpost.com', 'talksport.com', 'olbg.com', 'wikipedia.org',
    'github.com', 'reddit.com', 'medium.com', 'forbes.com',
    'bbc.com', 'bbc.co.uk', 'theguardian.com', 'mirror.co.uk',
    'gambling.com', 'askgamblers.com', 'casinomeister.com'
  ];

  if (legitimatePlatforms.some(p => candidate.includes(p))) {
    return false;
  }

  // Get the base domain name (without TLD)
  const originalBase = original.split('.')[0];
  const candidateBase = candidate.split('.')[0];

  // Check for brand name variations in candidate domain
  const brandNameClean = brand.replace(/casino|bet|slots|win|gaming/gi, '').trim();

  // Detect if candidate contains brand-related keywords
  const containsBrandName = candidate.includes(brandNameClean) ||
    candidate.includes(brand) ||
    candidate.includes(originalBase);

  if (!containsBrandName) return false;

  // Check for common imposter patterns:
  // 1. Different TLD (e.g., .com vs .be vs .net)
  // 2. Hyphens added (e.g., monster-casino vs monstercasino)
  // 3. Pluralization (e.g., spinzwins vs spinzwin)
  // 4. Extra characters (e.g., betrinos vs betrino)
  // 5. Numbers added (e.g., mogobet1 vs mogobet)

  // Different TLD with similar base
  if (candidateBase === originalBase && candidate !== original) {
    return true;
  }

  // Check for hyphen variations
  const candidateWithoutHyphens = candidate.replace(/-/g, '');
  const originalWithoutHyphens = original.replace(/-/g, '');
  if (candidateWithoutHyphens === originalWithoutHyphens && candidate !== original) {
    return true;
  }

  // Check for added hyphens in base
  const candidateBaseNoHyphens = candidateBase.replace(/-/g, '');
  if (candidateBaseNoHyphens === originalBase && candidate !== original) {
    return true;
  }

  // Check for pluralization (trailing 's')
  if (candidateBase === originalBase + 's' || originalBase === candidateBase + 's') {
    return true;
  }

  // Check for numbers added
  const candidateNoNumbers = candidateBase.replace(/\d+/g, '');
  if (candidateNoNumbers === originalBase && candidateBase !== originalBase) {
    return true;
  }

  // Levenshtein-like check - if very similar to original base (1-2 char difference)
  if (Math.abs(candidateBase.length - originalBase.length) <= 2) {
    const similarity = calculateSimilarity(candidateBase, originalBase);
    if (similarity >= 0.75 && candidate !== original) {
      return true;
    }
  }

  // If contains brand name but is a different domain entirely, flag it
  if (containsBrandName && candidate !== original) {
    return true;
  }

  return false;
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses a simple character matching approach
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] === longer[i]) matches++;
  }

  return matches / longer.length;
}

/**
 * Search Google via Zyte API
 */
export async function searchGoogle(
  query: string,
  geolocation: string = 'GB',
  startPage: number = 0 // 0 = first page, 10 = second page, etc.
): Promise<ZyteSerpResponse | null> {
  if (!ZYTE_API_KEY) {
    console.error('ZYTE_API_KEY not configured');
    return null;
  }

  try {
    const searchUrl = startPage === 0
      ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
      : `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${startPage}`;

    const response = await fetch(ZYTE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(ZYTE_API_KEY + ':').toString('base64'),
      },
      body: JSON.stringify({
        url: searchUrl,
        serp: true,
        serpOptions: { extractFrom: 'httpResponseBody' },
        geolocation,
        followRedirect: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zyte API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.serp as ZyteSerpResponse;
  } catch (error) {
    console.error('Zyte API request failed:', error);
    return null;
  }
}

/**
 * Search multiple pages and collect all results
 */
export async function searchGoogleMultiplePages(
  query: string,
  geolocation: string = 'GB',
  numPages: number = 10
): Promise<{
  results: ZyteSerpResult[];
  pagesScanned: number;
  totalResults: number;
  errors: string[];
}> {
  const allResults: ZyteSerpResult[] = [];
  const errors: string[] = [];
  let pagesScanned = 0;
  let totalResults = 0;

  for (let page = 0; page < numPages; page++) {
    const startIndex = page * 10;
    const response = await searchGoogle(query, geolocation, startIndex);

    if (response) {
      pagesScanned++;
      allResults.push(...response.organicResults);

      if (page === 0) {
        totalResults = response.metadata.totalOrganicResults;
      }
    } else {
      errors.push(`Failed to fetch page ${page + 1}`);
    }

    // Add a small delay between requests to be nice to the API
    if (page < numPages - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return { results: allResults, pagesScanned, totalResults, errors };
}

/**
 * Analyze search results for potential imposters
 */
export interface PotentialImposter {
  domain: string;
  fullUrl: string;
  pageTitle: string;
  pageDescription: string;
  searchRank: number;
}

export function analyzeResultsForImposters(
  results: ZyteSerpResult[],
  brandDomain: string,
  brandName: string
): PotentialImposter[] {
  const imposters: PotentialImposter[] = [];
  const seenDomains = new Set<string>();

  for (const result of results) {
    const domain = extractDomain(result.url);

    // Skip if we've already processed this domain
    if (seenDomains.has(domain)) continue;
    seenDomains.add(domain);

    if (isPotentialImposter(domain, brandDomain, brandName)) {
      imposters.push({
        domain,
        fullUrl: result.url,
        pageTitle: result.name,
        pageDescription: result.description,
        searchRank: result.rank,
      });
    }
  }

  return imposters;
}
