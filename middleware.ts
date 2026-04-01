import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sessionCookie = request.cookies.get('fortuna_session')?.value
  const session = sessionCookie ? await verifyToken(sessionCookie) : null

  if (pathname.startsWith('/admin')) {
    if (!session) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    if (session.cargo !== ADMIN_CARGO) {
      const url = request.nextUrl.clone()
      url.pathname = '/acesso-negado'
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/confirmar')) {
    if (!session) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/confirmar/:path*'],
}
