import { NextResponse } from 'next/server'
import { getTokensFromCode, getGmailAddress } from '@/lib/gmail'
import { prisma } from '@/lib/prisma'

// GET - Handle OAuth callback
export async function GET(request: Request) {
  // Get base URL from request or env
  const requestUrl = new URL(request.url)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || `${requestUrl.protocol}//${requestUrl.host}`

  try {
    const { searchParams } = requestUrl
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the userId
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/backlink-directory/prospects?gmail_error=${error}`, baseUrl)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/backlink-directory/prospects?gmail_error=missing_code', baseUrl)
      )
    }

    const userId = state

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/backlink-directory/prospects?gmail_error=no_tokens', baseUrl)
      )
    }

    // Get Gmail address
    const email = await getGmailAddress(tokens.access_token)

    if (!email) {
      return NextResponse.redirect(
        new URL('/backlink-directory/prospects?gmail_error=no_email', baseUrl)
      )
    }

    // Calculate expiry time
    const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600000)

    // Store credentials (upsert in case user reconnects)
    await prisma.gmailCredential.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        email
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        email
      }
    })

    // Redirect back to prospects page with success
    return NextResponse.redirect(
      new URL(`/backlink-directory/prospects?gmail_connected=${encodeURIComponent(email)}`, baseUrl)
    )
  } catch (error) {
    console.error('Gmail callback error:', error)
    return NextResponse.redirect(
      new URL('/backlink-directory/prospects?gmail_error=callback_failed', baseUrl)
    )
  }
}
