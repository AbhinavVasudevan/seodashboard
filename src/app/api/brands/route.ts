import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth-options'

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: {
            apps: true,
            keywords: true,
            backlinks: true,
            articles: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(brands)
  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to create a brand.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, domain, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Brand name is required' },
        { status: 400 }
      )
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        domain,
        description,
        userId: session.user.id,
      },
    })

    return NextResponse.json(brand, { status: 201 })
  } catch (error) {
    console.error('Error creating brand:', error)
    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    )
  }
}
