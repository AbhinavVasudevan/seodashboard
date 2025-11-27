export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/',
    '/brands/:path*',
    '/admin/:path*',
    '/writer/:path*',
    '/keywords/:path*',
    '/backlinks/:path*',
    '/articles/:path*',
    '/app-rankings/:path*',
    '/settings/:path*',
  ]
}
