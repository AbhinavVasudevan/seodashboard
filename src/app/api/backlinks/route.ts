import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    const backlinks = await prisma.backlink.findMany({
      where: {
        brandId: brandId || undefined,
      },
      include: {
        brand: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { dr: 'desc' },
        { createdAt: 'desc' }
      ],
    })

    return NextResponse.json(backlinks)
  } catch (error) {
    console.error('Error fetching backlinks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch backlinks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      rootDomain,
      referringPageUrl,
      dr,
      targetUrl,
      anchor,
      linkType,
      price,
      remarks,
      brandId,
    } = body

    if (!rootDomain || !referringPageUrl || !targetUrl || !brandId) {
      return NextResponse.json(
        { error: 'Root domain, referring page URL, target URL, and brandId are required' },
        { status: 400 }
      )
    }

    const backlink = await prisma.backlink.create({
      data: {
        rootDomain,
        referringPageUrl,
        dr: dr ? parseInt(dr) : null,
        targetUrl,
        anchor: anchor || null,
        linkType: linkType || null,
        price: price ? parseFloat(price) : null,
        remarks: remarks || null,
        brandId,
      },
    })

    return NextResponse.json(backlink, { status: 201 })
  } catch (error) {
    console.error('Error creating backlink:', error)
    return NextResponse.json(
      { error: 'Failed to create backlink' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Backlink ID is required' },
        { status: 400 }
      )
    }

    const backlink = await prisma.backlink.update({
      where: { id },
      data: {
        rootDomain: updateData.rootDomain,
        referringPageUrl: updateData.referringPageUrl,
        targetUrl: updateData.targetUrl,
        anchor: updateData.anchor || null,
        linkType: updateData.linkType || null,
        dr: updateData.dr ? parseInt(updateData.dr) : null,
        price: updateData.price ? parseFloat(updateData.price) : null,
        remarks: updateData.remarks || null,
      },
    })

    return NextResponse.json(backlink)
  } catch (error) {
    console.error('Error updating backlink:', error)
    return NextResponse.json(
      { error: 'Failed to update backlink' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Backlink ID is required' },
        { status: 400 }
      )
    }

    await prisma.backlink.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Backlink deleted successfully' })
  } catch (error) {
    console.error('Error deleting backlink:', error)
    return NextResponse.json(
      { error: 'Failed to delete backlink' },
      { status: 500 }
    )
  }
}
