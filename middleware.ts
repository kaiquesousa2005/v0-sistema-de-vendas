import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/admin-login', '/api/seed']
  const adminRoutes = ['/admin']
  const storeRoutes = ['/dashboard', '/gastos', '/vendidos', '/veiculos']

  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth-token')?.value
  const adminToken = request.cookies.get('admin-token')?.value

  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (!adminToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      await jwtVerify(adminToken, secret)
      return NextResponse.next()
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (storeRoutes.some(route => pathname.startsWith(route)) || pathname === '/') {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      await jwtVerify(token, secret)
      return NextResponse.next()
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)',
  ],
}
