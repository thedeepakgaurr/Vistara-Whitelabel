import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

// Fast path-gating only — pages/route handlers re-verify against the DB
// (see requireUser/requireAdmin in lib/auth.ts), since a JWT role claim can
// go stale if an account is deactivated after the token was issued.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  const isAdminRoute = pathname.startsWith('/admin');
  const isDashboardRoute = pathname.startsWith('/dashboard');

  if (!session && (isAdminRoute || isDashboardRoute)) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (session && isAdminRoute && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (session && isDashboardRoute && session.role === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL(session.role === 'admin' ? '/admin' : '/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login', '/signup'],
};
