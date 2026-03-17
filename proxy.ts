import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'gesticom_session'

const PUBLIC_PATHS = ['/', '/login', '/activation']

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/license')) return true
  if (pathname === '/favicon.ico' || pathname.startsWith('/images/') || pathname.match(/\.(ico|png|svg|jpg|jpeg|webp)$/)) return true
  return false
}

async function verify(token: string, secret: string): Promise<boolean> {
  try {
    const enc = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, enc)
    return !!(payload?.userId && payload?.login && payload?.role)
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPublic(pathname)) return NextResponse.next()

  let secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'development') {
      secret = 'GestiCom-Dev-Default-Secret-32chars-Minimum!!'
    } else {
      return NextResponse.redirect(new URL('/login?error=config', request.url))
    }
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    const login = new URL('/login', request.url)
    login.searchParams.set('from', pathname)
    return NextResponse.redirect(login)
  }

  const ok = await verify(token, secret)
  if (!ok) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete(COOKIE_NAME)
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
