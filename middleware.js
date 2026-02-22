import { NextResponse } from 'next/server';

export function middleware(req) {
  const pin = process.env.ADMIN_PIN;
  if (!pin) return NextResponse.next(); // No PIN = open access

  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname.startsWith('/api/')) return NextResponse.next();

  const cookiePin = req.cookies.get('admin_pin')?.value;
  if (cookiePin === pin) return NextResponse.next();

  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = { matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'] };
