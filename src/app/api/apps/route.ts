import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    const apps = await prisma.app.findMany({
      where: brandId ? { brandId } : undefined,
      include: {
        brand: {
          select: {
            name: true,
          },
        },
        rankings: {
          orderBy: {
            date: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(apps)
  } catch (error) {
    console.error('Error fetching apps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch apps' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, platform, brandId } = body

    if (!name || !platform || !brandId) {
      return NextResponse.json(
        { error: 'Name, platform, and brandId are required' },
        { status: 400 }
      )
    }

    const app = await prisma.app.create({
      data: {
        name,
        platform: platform.toUpperCase(),
        brandId,
      },
    })

    return NextResponse.json(app, { status: 201 })
  } catch (error) {
    console.error('Error creating app:', error)
    return NextResponse.json(
      { error: 'Failed to create app' },
      { status: 500 }
    )
  }
}
