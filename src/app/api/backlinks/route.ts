import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const status = searchParams.get('status')

    const backlinks = await prisma.backlink.findMany({
      where: {
        brandId: brandId || undefined,
        status: status as any || undefined,
      },
      include: {
        brand: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
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
      traffic,
      targetUrl,
      anchor,
      dofollow,
      status,
      price,
      builtOn,
      supplierEmail,
      liveFor,
      invoice,
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
        traffic: traffic ? parseInt(traffic) : null,
        targetUrl,
        anchor,
        dofollow: dofollow !== false,
        status: status || 'PENDING',
        price: price ? parseFloat(price) : null,
        builtOn: builtOn ? new Date(builtOn) : null,
        supplierEmail,
        liveFor: liveFor ? parseInt(liveFor) : null,
        invoice,
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
        ...updateData,
        builtOn: updateData.builtOn ? new Date(updateData.builtOn) : undefined,
        price: updateData.price ? parseFloat(updateData.price) : undefined,
        dr: updateData.dr ? parseInt(updateData.dr) : undefined,
        traffic: updateData.traffic ? parseInt(updateData.traffic) : undefined,
        liveFor: updateData.liveFor ? parseInt(updateData.liveFor) : undefined,
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
