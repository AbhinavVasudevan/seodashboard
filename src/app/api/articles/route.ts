import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    const articles = await prisma.article.findMany({
      where: brandId ? { brandId } : undefined,
      include: {
        brand: {
          select: {
            name: true
          }
        },
        requestedBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(articles)
  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      slNo,
      requestedById,
      articleType,
      brandId,
      topicTitle,
      gameProvider,
      primaryKeyword,
      finalWordCount,
      documentUrl,
      language,
      sentDate,
    } = body

    // Validate required fields
    if (!slNo || !requestedById || !articleType || !brandId || !topicTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if slNo is unique
    const existing = await prisma.article.findUnique({
      where: { slNo }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Article with this Sl No already exists' },
        { status: 400 }
      )
    }

    const article = await prisma.article.create({
      data: {
        slNo,
        requestedById,
        articleType,
        brandId,
        topicTitle,
        gameProvider,
        primaryKeyword,
        finalWordCount,
        documentUrl,
        language: language || 'EN', // Default to English
        sentDate: sentDate ? new Date(sentDate) : new Date(), // Default to today
        status: 'SUBMITTED', // Default status for new articles
      },
      include: {
        brand: {
          select: {
            name: true
          }
        },
        requestedBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error('Error creating article:', error)
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      )
    }

    // Prepare update data with proper type conversions
    const data: any = {
      ...updateData,
    }

    // Handle date fields
    if (updateData.publishDate) {
      data.publishDate = new Date(updateData.publishDate)
    }
    if (updateData.sentDate) {
      data.sentDate = new Date(updateData.sentDate)
    }

    // Handle number fields
    if (updateData.finalWordCount !== undefined) {
      data.finalWordCount = updateData.finalWordCount ? parseInt(updateData.finalWordCount) : null
    }
    if (updateData.originalWc !== undefined) {
      data.originalWc = updateData.originalWc ? parseInt(updateData.originalWc) : null
    }
    if (updateData.images !== undefined) {
      data.images = updateData.images ? parseInt(updateData.images) : null
    }

    // Handle float fields
    if (updateData.aiScore !== undefined) {
      data.aiScore = updateData.aiScore ? parseFloat(updateData.aiScore) : null
    }
    if (updateData.plagiarismScore !== undefined) {
      data.plagiarismScore = updateData.plagiarismScore ? parseFloat(updateData.plagiarismScore) : null
    }

    const article = await prisma.article.update({
      where: { id },
      data,
      include: {
        brand: {
          select: {
            name: true
          }
        },
        requestedBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Failed to update article' },
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
        { error: 'Article ID is required' },
        { status: 400 }
      )
    }

    await prisma.article.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Article deleted successfully' })
  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    )
  }
}
