import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

// POST - Import Ahrefs data (bulk)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { rows, competitorDomain, batchId } = body

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data to import' }, { status: 400 })
    }

    if (!competitorDomain) {
      return NextResponse.json({ error: 'Competitor domain is required' }, { status: 400 })
    }

    const importBatchId = batchId || `import-${Date.now()}`

    // Get existing prospect URLs to check for duplicates
    const existingProspects = await prisma.backlinkProspect.findMany({
      select: { referringPageUrl: true }
    })
    const existingUrls = new Set(existingProspects.map(p => p.referringPageUrl))

    // Get existing import URLs from same competitor
    const existingImports = await prisma.ahrefsImport.findMany({
      where: { competitorDomain },
      select: { referringPageUrl: true }
    })
    const existingImportUrls = new Set(existingImports.map(i => i.referringPageUrl))

    // Prepare records
    const newRecords = []
    let duplicateCount = 0
    let alreadyProspectCount = 0

    for (const row of rows) {
      const url = row.referringPageUrl || row['Referring page URL']
      if (!url) continue

      // Skip if already imported from this competitor
      if (existingImportUrls.has(url)) {
        duplicateCount++
        continue
      }

      // Check if already a prospect
      const isAlreadyProspect = existingUrls.has(url)
      if (isAlreadyProspect) alreadyProspectCount++

      newRecords.push({
        referringPageTitle: row.referringPageTitle || row['Referring page title'] || null,
        referringPageUrl: url,
        language: row.language || row['Language'] || null,
        platform: row.platform || row['Platform'] || null,
        httpCode: row.httpCode ? parseInt(row.httpCode) : (row['Referring page HTTP code'] ? parseInt(row['Referring page HTTP code']) : null),
        domainRating: row.domainRating ? parseInt(row.domainRating) : (row['Domain rating'] ? parseInt(row['Domain rating']) : null),
        urlRating: row.urlRating ? parseInt(row.urlRating) : (row['UR'] ? parseInt(row['UR']) : null),
        domainTraffic: row.domainTraffic ? parseInt(row.domainTraffic) : (row['Domain traffic'] ? parseInt(row['Domain traffic']) : null),
        referringDomains: row.referringDomains ? parseInt(row.referringDomains) : (row['Referring domains'] ? parseInt(row['Referring domains']) : null),
        linkedDomains: row.linkedDomains ? parseInt(row.linkedDomains) : (row['Linked domains'] ? parseInt(row['Linked domains']) : null),
        externalLinks: row.externalLinks ? parseInt(row.externalLinks) : (row['External links'] ? parseInt(row['External links']) : null),
        pageTraffic: row.pageTraffic ? parseInt(row.pageTraffic) : (row['Page traffic'] ? parseInt(row['Page traffic']) : null),
        keywords: row.keywords ? parseInt(row.keywords) : (row['Keywords'] ? parseInt(row['Keywords']) : null),
        targetUrl: row.targetUrl || row['Target URL'] || null,
        anchor: row.anchor || row['Anchor'] || null,
        linkType: row.linkType || row['Type'] || null,
        contentType: row.contentType || row['Content'] || null,
        nofollow: row.nofollow === true || row['Nofollow'] === 'true' || row['Nofollow'] === true,
        ugc: row.ugc === true || row['UGC'] === 'true' || row['UGC'] === true,
        sponsored: row.sponsored === true || row['Sponsored'] === 'true' || row['Sponsored'] === true,
        firstSeen: row.firstSeen ? new Date(row.firstSeen) : (row['First seen'] ? new Date(row['First seen']) : null),
        lastSeen: row.lastSeen ? new Date(row.lastSeen) : (row['Last seen'] ? new Date(row['Last seen']) : null),
        importBatchId,
        competitorDomain,
        isProspect: isAlreadyProspect
      })
    }

    // Bulk insert
    if (newRecords.length > 0) {
      await prisma.ahrefsImport.createMany({
        data: newRecords,
        skipDuplicates: true
      })
    }

    return NextResponse.json({
      message: 'Import completed',
      imported: newRecords.length,
      duplicates: duplicateCount,
      alreadyProspects: alreadyProspectCount,
      batchId: importBatchId
    }, { status: 201 })
  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 })
  }
}

// PUT - Mark import as prospect (add to prospects list)
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { ids } = body // Array of import IDs to convert to prospects

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 })
    }

    // Get imports
    const imports = await prisma.ahrefsImport.findMany({
      where: { id: { in: ids } }
    })

    let created = 0
    let skipped = 0

    for (const imp of imports) {
      try {
        // Extract root domain from URL
        const url = new URL(imp.referringPageUrl)
        const rootDomain = url.hostname

        await prisma.backlinkProspect.create({
          data: {
            referringPageUrl: imp.referringPageUrl,
            rootDomain,
            domainRating: imp.domainRating,
            domainTraffic: imp.domainTraffic,
            nofollow: imp.nofollow,
            source: `ahrefs-${imp.competitorDomain}`,
            status: 'NOT_CONTACTED'
          }
        })

        // Mark as prospect in imports
        await prisma.ahrefsImport.update({
          where: { id: imp.id },
          data: { isProspect: true }
        })

        created++
      } catch {
        // Likely duplicate
        skipped++
      }
    }

    return NextResponse.json({
      message: 'Prospects created',
      created,
      skipped
    })
  } catch (error) {
    console.error('Error creating prospects from imports:', error)
    return NextResponse.json({ error: 'Failed to create prospects' }, { status: 500 })
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
