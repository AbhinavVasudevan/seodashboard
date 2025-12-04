import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper to extract root domain from URL
function extractRootDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    let hostname = urlObj.hostname.toLowerCase()

    // Remove www prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4)
    }

    // Handle multi-part TLDs (co.uk, com.au, etc.)
    const parts = hostname.split('.')
    const multiPartTlds = ['co.uk', 'com.au', 'co.nz', 'com.br', 'co.za', 'co.in', 'com.mx', 'co.jp']

    for (const tld of multiPartTlds) {
      if (hostname.endsWith(tld)) {
        const tldParts = tld.split('.').length
        return parts.slice(-(tldParts + 1)).join('.')
      }
    }

    // Default: return last two parts
    return parts.slice(-2).join('.')
  } catch {
    return url.toLowerCase()
  }
}

// Parse contact method from string
function parseContactMethod(method: string | null): 'EMAIL' | 'CONTACT_FORM' | 'SOCIAL_MEDIA' | 'OTHER' | null {
  if (!method) return null
  const lower = method.toLowerCase()
  if (lower.includes('email')) return 'EMAIL'
  if (lower.includes('contact') || lower.includes('form')) return 'CONTACT_FORM'
  if (lower.includes('social') || lower.includes('twitter') || lower.includes('linkedin')) return 'SOCIAL_MEDIA'
  if (method.trim()) return 'OTHER'
  return null
}

// Parse date from various formats
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null

  // Try various date formats
  const formats = [
    // DD-Month-YYYY (e.g., "16-September-2025")
    /^(\d{1,2})-([A-Za-z]+)-(\d{4})$/,
    // M/D/YYYY (e.g., "9/16/2025")
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{2})-(\d{2})$/,
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      try {
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          return date
        }
      } catch {
        continue
      }
    }
  }

  // Last resort: try native parsing
  try {
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date
    }
  } catch {
    // Ignore
  }

  return null
}

// POST - Import domains from CSV/sheet data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data } = body // Array of row objects

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      )
    }

    let created = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    // Group by root domain first
    const domainMap = new Map<string, {
      rootDomain: string;
      exampleUrl: string;
      domainRating: number | null;
      domainTraffic: number | null;
      nofollow: boolean;
      contactedOn: Date | null;
      contactMethod: 'EMAIL' | 'CONTACT_FORM' | 'SOCIAL_MEDIA' | 'OTHER' | null;
      contactEmail: string | null;
      contactFormUrl: string | null;
      remarks: string | null;
    }>()

    for (const row of data) {
      try {
        // Get the referring page URL (required)
        const referringPageUrl = row['Referring page URL'] || row['referringPageUrl'] || row['url'] || row['URL']
        if (!referringPageUrl) {
          skipped++
          continue
        }

        const rootDomain = extractRootDomain(referringPageUrl)

        // Get other fields with various possible column names
        const domainRating = parseInt(row['Domain rating'] || row['domainRating'] || row['DR'] || row['dr'] || '0') || null
        const domainTraffic = parseInt(row['Domain traffic'] || row['domainTraffic'] || row['traffic'] || '0') || null
        const nofollowStr = row['Nofollow'] || row['nofollow'] || ''
        const nofollow = nofollowStr === true || nofollowStr === 'TRUE' || nofollowStr === 'true' || nofollowStr === '1'
        const contactedOnStr = row['Contacted On'] || row['contactedOn'] || row['contacted_on'] || null
        const contactedOn = parseDate(contactedOnStr)
        const contactMethodStr = row['Contacted'] || row['Contact (Method)'] || row['contactMethod'] || row['contact_method'] || null
        const contactMethod = parseContactMethod(contactMethodStr)
        const remarks = row['Remarks'] || row['remarks'] || row['notes'] || null
        const emailOrLink = row['Email/Link'] || row['email'] || row['contact_email'] || null

        // Determine if it's an email or contact form URL
        let contactEmail: string | null = null
        let contactFormUrl: string | null = null
        if (emailOrLink) {
          if (emailOrLink.includes('@')) {
            contactEmail = emailOrLink
          } else if (emailOrLink.startsWith('http')) {
            contactFormUrl = emailOrLink
          }
        }

        // Update domain map (keep best values)
        const existing = domainMap.get(rootDomain)
        if (existing) {
          // Update with better values
          if (domainRating && (!existing.domainRating || domainRating > existing.domainRating)) {
            existing.domainRating = domainRating
          }
          if (domainTraffic && (!existing.domainTraffic || domainTraffic > existing.domainTraffic)) {
            existing.domainTraffic = domainTraffic
          }
          if (nofollow) existing.nofollow = true
          if (contactedOn && !existing.contactedOn) existing.contactedOn = contactedOn
          if (contactMethod && !existing.contactMethod) existing.contactMethod = contactMethod
          if (contactEmail && !existing.contactEmail) existing.contactEmail = contactEmail
          if (contactFormUrl && !existing.contactFormUrl) existing.contactFormUrl = contactFormUrl
          if (remarks && !existing.remarks) existing.remarks = remarks
        } else {
          domainMap.set(rootDomain, {
            rootDomain,
            exampleUrl: referringPageUrl,
            domainRating,
            domainTraffic,
            nofollow,
            contactedOn,
            contactMethod,
            contactEmail,
            contactFormUrl,
            remarks,
          })
        }
      } catch (err) {
        errors.push(`Error processing row: ${err}`)
        skipped++
      }
    }

    // Now upsert domains
    const domainEntries = Array.from(domainMap.values())

    for (const domainData of domainEntries) {
      try {
        const existing = await prisma.linkDirectoryDomain.findUnique({
          where: { rootDomain: domainData.rootDomain },
        })

        if (existing) {
          // Update with new data if fields are empty
          await prisma.linkDirectoryDomain.update({
            where: { id: existing.id },
            data: {
              exampleUrl: existing.exampleUrl || domainData.exampleUrl,
              domainRating: existing.domainRating || domainData.domainRating,
              domainTraffic: existing.domainTraffic || domainData.domainTraffic,
              nofollow: domainData.nofollow || existing.nofollow,
              contactedOn: existing.contactedOn || domainData.contactedOn,
              contactMethod: existing.contactMethod || domainData.contactMethod,
              contactEmail: existing.contactEmail || domainData.contactEmail,
              contactFormUrl: existing.contactFormUrl || domainData.contactFormUrl,
              remarks: existing.remarks || domainData.remarks,
            },
          })
          updated++
        } else {
          await prisma.linkDirectoryDomain.create({
            data: domainData,
          })
          created++
        }
      } catch (err) {
        errors.push(`Error saving domain ${domainData.rootDomain}: ${err}`)
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      totalProcessed: domainEntries.length,
      errors: errors.slice(0, 10), // Return first 10 errors
    })
  } catch (error) {
    console.error('Error importing to link directory:', error)
    return NextResponse.json(
      { error: 'Failed to import to link directory' },
      { status: 500 }
    )
  }
}
