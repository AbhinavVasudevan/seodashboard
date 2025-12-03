import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch deals with filters and comparison data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const status = searchParams.get('status')
    const compare = searchParams.get('compare') // 'true' for comparison view

    const whereClause: Record<string, unknown> = {}

    if (brandId) whereClause.brandId = brandId
    if (status) whereClause.status = status

    const deals = await prisma.brandBacklinkDeal.findMany({
      where: whereClause,
      include: {
        brand: {
          select: { id: true, name: true, domain: true }
        },
        prospect: {
          select: { id: true, referringPageUrl: true, rootDomain: true, status: true }
        }
      },
      orderBy: [
        { domainRating: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // If comparison mode, group by domain and show which brands have deals
    if (compare === 'true') {
      const brands = await prisma.brand.findMany({
        select: { id: true, name: true }
      })

      // Group deals by root domain
      const domainMap = new Map<string, { domain: string, dr: number | null, deals: Record<string, { dealId: string, status: string, price: number | null }> }>()

      for (const deal of deals) {
        const url = new URL(deal.referringPageUrl)
        const rootDomain = url.hostname

        if (!domainMap.has(rootDomain)) {
          domainMap.set(rootDomain, {
            domain: rootDomain,
            dr: deal.domainRating,
            deals: {}
          })
        }

        const entry = domainMap.get(rootDomain)!
        entry.deals[deal.brandId] = {
          dealId: deal.id,
          status: deal.status,
          price: deal.price
        }

        // Update DR if higher
        if (deal.domainRating && (!entry.dr || deal.domainRating > entry.dr)) {
          entry.dr = deal.domainRating
        }
      }

      // Convert to array and sort by DR
      const comparison = Array.from(domainMap.values())
        .sort((a, b) => (b.dr || 0) - (a.dr || 0))

      return NextResponse.json({
        brands,
        comparison,
        totalDomains: comparison.length
      })
    }

    return NextResponse.json(deals)
  } catch (error) {
    console.error('Error fetching deals:', error)
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
  }
}

// POST - Create a new deal
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      brandId,
      prospectId,
      referringPageUrl,
      linkUrl,
      linkAnchor,
      domainRating,
      linkType,
      price,
      status,
      remarks,
      publishedOn,
      expiresOn
    } = body

    if (!brandId || !referringPageUrl || !linkUrl) {
      return NextResponse.json(
        { error: 'brandId, referringPageUrl, and linkUrl are required' },
        { status: 400 }
      )
    }

    // Check for existing deal
    const existing = await prisma.brandBacklinkDeal.findUnique({
      where: {
        brandId_referringPageUrl: { brandId, referringPageUrl }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Deal already exists for this brand and URL' },
        { status: 409 }
      )
    }

    const deal = await prisma.brandBacklinkDeal.create({
      data: {
        brandId,
        prospectId: prospectId || null,
        referringPageUrl,
        linkUrl,
        linkAnchor: linkAnchor || null,
        domainRating: domainRating ? parseInt(domainRating) : null,
        linkType: linkType || null,
        price: price ? parseFloat(price) : null,
        status: status || 'PENDING',
        remarks: remarks || null,
        publishedOn: publishedOn ? new Date(publishedOn) : null,
        expiresOn: expiresOn ? new Date(expiresOn) : null
      },
      include: {
        brand: { select: { id: true, name: true } }
      }
    })

    // If linked to a prospect, update prospect status
    if (prospectId) {
      await prisma.backlinkProspect.update({
        where: { id: prospectId },
        data: { status: 'DEAL_LOCKED' }
      })
    }

    return NextResponse.json(deal, { status: 201 })
  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}

// PUT - Update a deal
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Convert types
    if (updateData.domainRating) {
      updateData.domainRating = parseInt(updateData.domainRating)
    }
    if (updateData.price) {
      updateData.price = parseFloat(updateData.price)
    }
    if (updateData.publishedOn) {
      updateData.publishedOn = new Date(updateData.publishedOn)
    }
    if (updateData.expiresOn) {
      updateData.expiresOn = new Date(updateData.expiresOn)
    }

    const deal = await prisma.brandBacklinkDeal.update({
      where: { id },
      data: updateData,
      include: {
        brand: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(deal)
  } catch (error) {
    console.error('Error updating deal:', error)
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}

// DELETE - Delete a deal
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.brandBacklinkDeal.delete({ where: { id } })

    return NextResponse.json({ message: 'Deal deleted successfully' })
  } catch (error) {
    console.error('Error deleting deal:', error)
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}
