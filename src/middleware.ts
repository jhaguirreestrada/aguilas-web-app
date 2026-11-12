import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/server/modules/auth/session'

/**
 * Guard de páginas (Edge): verifica la firma/expiración de la cookie httpOnly `auth_token`.
 * Las rutas /api validan la sesión por su cuenta (además contra la base de datos).
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.AUTH_JWT_SECRET)

  if (pathname === '/login') {
    return session ? NextResponse.redirect(new URL('/dashboard', req.url)) : NextResponse.next()
  }
  if (!session) {
    const url = new URL('/login', req.url)
    if (pathname !== '/' && pathname !== '/dashboard') url.searchParams.set('next', pathname)
    const res = NextResponse.redirect(url)
    if (req.cookies.get(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE) // cookie vencida/manipulada
    return res
  }
  return NextResponse.next()
}
