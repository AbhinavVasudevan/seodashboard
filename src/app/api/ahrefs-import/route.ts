import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper to extract root domain from URL (handles subdomains like apps.apple.com -> apple.com)
function extractRootDomain(url: string): string {
  try {
    const parsed = new URL(url)
    let hostname = parsed.hostname.replace(/^www\./, '').toLowerCase()

    // List of known multi-part TLDs
    const multiPartTlds = [
      'co.uk', 'com.au', 'co.nz', 'co.za', 'com.br', 'co.jp', 'co.kr',
      'com.mx', 'com.sg', 'com.hk', 'co.in', 'com.tw', 'com.ar', 'com.tr'
    ]

    // Check if it ends with a multi-part TLD
    for (const tld of multiPartTlds) {
      if (hostname.endsWith('.' + tld)) {
        // Extract: domain.co.uk from subdomain.domain.co.uk
        const parts = hostname.slice(0, -(tld.length + 1)).split('.')
        return parts[parts.length - 1] + '.' + tld
      }
    }

    // Standard single TLD: extract last two parts (domain.com from subdomain.domain.com)
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      return parts.slice(-2).join('.')
    }

    return hostname
  } catch {
    return url.toLowerCase()
  }
}

// GET - Fetch imports with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')
    const competitorDomain = searchParams.get('competitorDomain')
    const isProspect = searchParams.get('isProspect')
    const minDr = searchParams.get('minDr')

    const whereClause: Record<string, unknown> = {}

    if (batchId) whereClause.importBatchId = batchId
    if (competitorDomain) whereClause.competitorDomain = competitorDomain
    if (isProspect === 'true') whereClause.isProspect = true
    if (minDr) whereClause.domainRating = { gte: parseInt(minDr) }

    const imports = await prisma.ahrefsImport.findMany({
      where: whereClause,
      orderBy: [
        { domainRating: 'desc' },
        { domainTraffic: 'desc' }
      ],
      take: 500 // Limit results
    })

    return NextResponse.json(imports)
  } catch (error) {
    console.error('Error fetching imports:', error)
    return NextResponse.json({ error: 'Failed to fetch imports' }, { status: 500 })
  }
}

// POST - Analyze competitor backlinks and compare with our existing backlinks
// This is the main import endpoint that does intelligent comparison
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { rows, competitorDomain } = body

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data to import' }, { status: 400 })
    }

    if (!competitorDomain) {
      return NextResponse.json({ error: 'Competitor domain is required' }, { status: 400 })
    }

    // 1. Get ALL our existing backlink root domains (across all brands)
    const existingBacklinks = await prisma.backlink.findMany({
      select: {
        rootDomain: true,
        brandId: true,
        brand: { select: { name: true } }
      }
    })

    // Create a map of domains we already have backlinks from
    const existingBacklinkDomains = new Map<string, string[]>()
    existingBacklinks.forEach(bl => {
      const domain = bl.rootDomain.toLowerCase().replace(/^www\./, '')
      const brands = existingBacklinkDomains.get(domain) || []
      if (!brands.includes(bl.brand.name)) {
        brands.push(bl.brand.name)
      }
      existingBacklinkDomains.set(domain, brands)
    })

    // 1b. Also get domains from LinkDirectoryDomain (even without backlinks)
    const directoryDomains = await prisma.linkDirectoryDomain.findMany({
      select: { rootDomain: true }
    })
    const directoryDomainSet = new Set(
      directoryDomains.map(d => d.rootDomain.toLowerCase().replace(/^www\./, ''))
    )

    // 2. Get existing prospect URLs and domains
    const existingProspects = await prisma.backlinkProspect.findMany({
      select: { referringPageUrl: true, rootDomain: true, status: true }
    })
    const existingProspectUrls = new Set(existingProspects.map(p => p.referringPageUrl))
    const existingProspectDomains = new Map<string, string>()
    existingProspects.forEach(p => {
      existingProspectDomains.set(p.rootDomain.toLowerCase().replace(/^www\./, ''), p.status)
    })

    // 3. Process each row and categorize
    const analyzed: Array<{
      url: string
      rootDomain: string
      dr: number | null
      traffic: number | null
      anchor: string | null
      linkType: string | null
      status: 'new' | 'already_have' | 'in_prospects'
      existingBrands?: string[]
      prospectStatus?: string
    }> = []

    let newOpportunities = 0
    let alreadyHave = 0
    let inProspects = 0

    for (const row of rows) {
      const url = row.referringPageUrl || row['Referring page URL']
      if (!url || !url.startsWith('http')) continue

      const rootDomain = extractRootDomain(url)
      const dr = row.domainRating ? parseInt(row.domainRating) :
                 (row['Domain rating'] ? parseInt(row['Domain rating']) : null)
      const traffic = row.domainTraffic ? parseInt(row.domainTraffic) :
                      (row['Domain traffic'] ? parseInt(row['Domain traffic']) : null)
      const anchor = row.anchor || row['Anchor'] || null
      const linkType = row.linkType || row['Type'] || null

      // Check status
      let status: 'new' | 'already_have' | 'in_prospects' = 'new'
      let existingBrands: string[] | undefined
      let prospectStatus: string | undefined

      if (existingBacklinkDomains.has(rootDomain)) {
        status = 'already_have'
        existingBrands = existingBacklinkDomains.get(rootDomain)
        alreadyHave++
      } else if (directoryDomainSet.has(rootDomain)) {
        // Domain is in our Link Directory (even without backlinks)
        status = 'already_have'
        existingBrands = ['In Directory']
        alreadyHave++
      } else if (existingProspectDomains.has(rootDomain) || existingProspectUrls.has(url)) {
        status = 'in_prospects'
        prospectStatus = existingProspectDomains.get(rootDomain) || 'NOT_CONTACTED'
        inProspects++
      } else {
        newOpportunities++
      }

      analyzed.push({
        url,
        rootDomain,
        dr,
        traffic,
        anchor,
        linkType,
        status,
        existingBrands,
        prospectStatus
      })
    }

    // Sort: new opportunities first, then by DR
    analyzed.sort((a, b) => {
      // Status priority: new > in_prospects > already_have
      const statusOrder = { new: 0, in_prospects: 1, already_have: 2 }
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      // Then by DR (desc)
      return (b.dr || 0) - (a.dr || 0)
    })

    return NextResponse.json({
      competitorDomain,
      totalRows: rows.length,
      analyzed: analyzed.length,
      stats: {
        newOpportunities,
        alreadyHave,
        inProspects
      },
      data: analyzed
    })
  } catch (error) {
    console.error('Error analyzing import:', error)
    return NextResponse.json({ error: 'Failed to analyze import' }, { status: 500 })
  }
}

// PUT - Add selected domains as prospects
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { prospects, competitorDomain } = body

    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ error: 'No prospects to add' }, { status: 400 })
    }

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const prospect of prospects) {
      try {
        const rootDomain = extractRootDomain(prospect.url)

        // Check if already exists (by URL or domain)
        const existing = await prisma.backlinkProspect.findFirst({
          where: {
            OR: [
              { referringPageUrl: prospect.url },
              { rootDomain: rootDomain }
            ]
          }
        })

        if (existing) {
          skipped++
          continue
        }

        await prisma.backlinkProspect.create({
          data: {
            referringPageUrl: prospect.url,
            rootDomain,
            domainRating: prospect.dr || null,
            domainTraffic: prospect.traffic || null,
            nofollow: prospect.linkType?.toLowerCase().includes('nofollow') || false,
            source: competitorDomain ? `ahrefs-${competitorDomain}` : 'ahrefs-import',
            status: 'NOT_CONTACTED'
          }
        })

        created++
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`${prospect.rootDomain}: ${errorMsg}`)
        skipped++
      }
    }

    return NextResponse.json({
      message: 'Prospects added',
      created,
      skipped,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined
    })
  } catch (error) {
    console.error('Error adding prospects:', error)
    return NextResponse.json({ error: 'Failed to add prospects' }, { status: 500 })
  }
}

// DELETE - Delete an import batch
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })
    }

    const result = await prisma.ahrefsImport.deleteMany({
      where: { importBatchId: batchId }
    })

    return NextResponse.json({
      message: 'Batch deleted',
      deleted: result.count
    })
  } catch (error) {
    console.error('Error deleting batch:', error)
    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 })
  }
}
