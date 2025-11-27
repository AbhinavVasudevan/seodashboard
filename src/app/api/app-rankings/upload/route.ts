import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData() as any
    const file = formData.get('file') as File | null
    const appId = formData.get('appId') as string | null

    if (!file || !appId) {
      return NextResponse.json(
        { error: 'File and appId are required' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    // Skip header if exists
    const firstLine = lines[0].toLowerCase()
    const hasHeader = firstLine.includes('keyword') && 
                     (firstLine.includes('country') || firstLine.includes('rank'))
    const dataLines = hasHeader ? lines.slice(1) : lines
    
    const rankings = []
    let processedCount = 0
    
    console.log(`Processing ${dataLines.length} data lines`)
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]
      console.log(`Processing line ${i + 1}:`, line)
      
      // Handle CSV, tab-separated, semicolon-separated, and space-separated formats
      let columns: string[]
      
      if (line.includes(',')) {
        // CSV format
        columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''))
      } else if (line.includes('\t')) {
        // Tab-separated format
        columns = line.split('\t').map(col => col.trim())
      } else if (line.includes(';')) {
        // Semicolon-separated format
        columns = line.split(';').map(col => col.trim().replace(/^"|"$/g, ''))
      } else {
        // Space-separated format - use smarter pattern recognition
        const parts = line.split(/\s+/).filter(col => col.trim() !== '')
        
        // Find country code (2-letter uppercase code)
        let countryIndex = -1
        for (let i = parts.length - 1; i >= 0; i--) {
          if (parts[i].length === 2 && /^[A-Z]{2}$/.test(parts[i])) {
            countryIndex = i
            break
          }
        }
        
        // Find rank (number with optional #)
        let rankIndex = -1
        for (let i = parts.length - 1; i >= 0; i--) {
          if (/^#?\d+$/.test(parts[i])) {
            rankIndex = i
            break
          }
        }
        
        console.log(`Found country at index ${countryIndex}: ${countryIndex >= 0 ? parts[countryIndex] : 'none'}`)
        console.log(`Found rank at index ${rankIndex}: ${rankIndex >= 0 ? parts[rankIndex] : 'none'}`)
        
        if (countryIndex >= 0 && rankIndex >= 0 && rankIndex > countryIndex) {
          // We found both country and rank, extract the fields
          const country = parts[countryIndex]
          const rank = parts[rankIndex]
          
          // Extract score and traffic if they exist
          const score = rankIndex + 1 < parts.length ? parts[rankIndex + 1] : null
          const traffic = rankIndex + 2 < parts.length ? parts[rankIndex + 2] : null
          
          // Everything before country is the keyword
          const keyword = parts.slice(0, countryIndex).join(' ')
          
          columns = [keyword, country, rank, score, traffic].filter(col => col !== null)
        } else {
          // Fallback to previous logic
          if (parts.length >= 5) {
            const country = parts[parts.length - 4]
            const rank = parts[parts.length - 3]
            const score = parts[parts.length - 2]
            const traffic = parts[parts.length - 1]
            const keyword = parts.slice(0, parts.length - 4).join(' ')
            columns = [keyword, country, rank, score, traffic]
          } else if (parts.length >= 4) {
            const country = parts[parts.length - 3]
            const rank = parts[parts.length - 2]
            const score = parts[parts.length - 1]
            const keyword = parts.slice(0, parts.length - 3).join(' ')
            columns = [keyword, country, rank, score]
          } else if (parts.length >= 3) {
            const country = parts[parts.length - 2]
            const rank = parts[parts.length - 1]
            const keyword = parts.slice(0, parts.length - 2).join(' ')
            columns = [keyword, country, rank]
          } else {
            columns = parts
          }
        }
      }
      
      console.log(`Parsed columns:`, columns)
      
      // Skip header rows
      if (columns[0]?.toLowerCase() === 'keyword' || 
          columns[0]?.toLowerCase() === 'keyword,country,rank,score,traffic') {
        console.log(`Skipping header row:`, columns)
        continue
      }
      
      if (columns.length >= 3) {
        const [keyword, country, rank, score, traffic, dateStr] = columns
        
        console.log(`Extracted values - Keyword: ${keyword}, Country: ${country}, Rank: ${rank}, Score: ${score}, Traffic: ${traffic}, Date: ${dateStr}`)
        
        // Validate required fields
        if (!keyword || !country || rank === undefined || rank === '') {
          console.warn(`Skipping invalid line: ${line} - missing required fields`)
          continue
        }
        
        // Clean up rank value (remove # symbol and convert to number)
        const cleanRank = rank.toString().replace('#', '').trim()
        const rankValue = parseInt(cleanRank) || 0
        
        // Clean up score and traffic (handle "-" and empty values)
        const scoreValue = score && score !== '' && score !== '-' ? parseInt(score) : null
        const trafficValue = traffic && traffic !== '' && traffic !== '-' ? parseInt(traffic) : null
        
        // Handle date parsing
        let uploadDate = new Date()
        if (dateStr && dateStr !== '') {
          // Try to parse the date if provided
          const parsedDate = new Date(dateStr)
          if (!isNaN(parsedDate.getTime())) {
            uploadDate = parsedDate
          }
        }
        
        const rankingData = {
          appId,
          keyword,
          country: country.toUpperCase(),
          rank: rankValue,
          score: scoreValue,
          traffic: trafficValue,
          date: uploadDate,
        }
        
        console.log(`Prepared ranking data:`, rankingData)
        
        rankings.push(rankingData)
        processedCount++
      } else {
        console.warn(`Skipping line - not enough columns: ${line}`)
      }
    }
    
    console.log(`Total rankings prepared: ${rankings.length}`)

    if (rankings.length === 0) {
      return NextResponse.json(
        { error: 'No valid ranking data found in the file. Expected format: Keyword, Country, Rank, Score, Traffic' },
        { status: 400 }
      )
    }

    let createdCount = 0
    let updatedCount = 0

    // Process each ranking individually - no need to match keywords table
    for (const ranking of rankings) {
      try {
        // Check if a ranking record already exists for this app, keyword, country, and date
        const existingRanking = await prisma.appRanking.findFirst({
          where: {
            appId: ranking.appId,
            keyword: ranking.keyword,
            country: ranking.country,
            date: ranking.date,
          },
        })

        if (existingRanking) {
          // Update existing ranking record
          await prisma.appRanking.update({
            where: { id: existingRanking.id },
            data: {
              rank: ranking.rank,
              score: ranking.score,
              traffic: ranking.traffic,
            },
          })
          updatedCount++
          console.log(`Updated ranking for ${ranking.keyword}`)
        } else {
          // Create new ranking record
          await prisma.appRanking.create({
            data: ranking,
          })
          createdCount++
          console.log(`Created new ranking for ${ranking.keyword}`)
        }
      } catch (error) {
        console.error(`Error processing ranking for ${ranking.keyword}:`, error)
      }
    }

    return NextResponse.json({
      message: `Successfully processed ${processedCount} keyword rankings`,
      processed: processedCount,
      created: createdCount,
      updated: updatedCount,
      date: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error uploading app rankings:', error)
    return NextResponse.json(
      { error: 'Failed to upload rankings: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get('appId')
    const keyword = searchParams.get('keyword')
    const country = searchParams.get('country')
    const limit = parseInt(searchParams.get('limit') || '100')
    const clear = searchParams.get('clear')

    // If clear parameter is provided, delete all rankings for the app
    if (clear === 'true' && appId) {
      const deleteResult = await prisma.appRanking.deleteMany({
        where: {
          appId: appId,
        },
      })
      return NextResponse.json({
        message: `Cleared ${deleteResult.count} ranking records for app`,
        cleared: deleteResult.count,
      })
    }

    const rankings = await prisma.appRanking.findMany({
      where: {
        appId: appId || undefined,
        keyword: keyword || undefined,
        country: country || undefined,
      },
      include: {
        app: {
          select: {
            name: true,
            platform: true,
            brand: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
    })

    return NextResponse.json(rankings)
  } catch (error) {
    console.error('Error fetching app rankings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rankings' },
      { status: 500 }
    )
  }
}
