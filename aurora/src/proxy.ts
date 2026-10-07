import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, isValidSession } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) return NextResponse.next();

  const session = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (isValidSession(session)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    const response = NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('returnTo', `${pathname}${search}`);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
