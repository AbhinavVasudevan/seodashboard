import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Bulk update keyword volumes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keywords, appId } = body

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      )
    }

    if (!appId) {
      return NextResponse.json(
        { error: 'appId is required' },
        { status: 400 }
      )
    }

    const results = {
      updated: 0,
      created: 0,
      errors: [] as string[],
    }

    for (const kw of keywords) {
      const { keyword, country, traffic, iosSearchVolume, androidSearchVolume } = kw

      if (!keyword) {
        results.errors.push(`Missing keyword name`)
        continue
      }

      try {
        // Try to find existing keyword
        const existing = await prisma.keyword.findFirst({
          where: {
            keyword: keyword.toLowerCase().trim(),
            appId,
            country: country?.toUpperCase() || 'US',
          },
        })

        if (existing) {
          // Update existing keyword
          await prisma.keyword.update({
            where: { id: existing.id },
            data: {
              traffic: traffic !== undefined ? traffic : existing.traffic,
              iosSearchVolume: iosSearchVolume !== undefined ? iosSearchVolume : existing.iosSearchVolume,
              androidSearchVolume: androidSearchVolume !== undefined ? androidSearchVolume : existing.androidSearchVolume,
            },
          })
          results.updated++
        } else {
          // Create new keyword with volumes
          await prisma.keyword.create({
            data: {
              keyword: keyword.toLowerCase().trim(),
              country: country?.toUpperCase() || 'US',
              appId,
              traffic: traffic || null,
              iosSearchVolume: iosSearchVolume || null,
              androidSearchVolume: androidSearchVolume || null,
            },
          })
          results.created++
        }
      } catch (err) {
        results.errors.push(`Failed to process keyword: ${keyword}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('Error updating keyword volumes:', error)
    return NextResponse.json(
      { error: 'Failed to update keyword volumes' },
      { status: 500 }
    )
  }
}

// Update a single keyword's volume
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { keywordId, traffic, iosSearchVolume, androidSearchVolume } = body

    if (!keywordId) {
      return NextResponse.json(
        { error: 'keywordId is required' },
        { status: 400 }
      )
    }

    const updated = await prisma.keyword.update({
      where: { id: keywordId },
      data: {
        ...(traffic !== undefined && { traffic }),
        ...(iosSearchVolume !== undefined && { iosSearchVolume }),
        ...(androidSearchVolume !== undefined && { androidSearchVolume }),
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Error updating keyword volume:', error)
    return NextResponse.json(
      { error: 'Failed to update keyword volume' },
      { status: 500 }
    )
  }
}
