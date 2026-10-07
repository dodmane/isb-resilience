import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, createSession, SESSION_MAX_AGE_SECONDS, validCredentials } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Enter an email and password.' }, { status: 400 });
  }

  if (!validCredentials(body.email, body.password)) {
    return NextResponse.json({ error: 'Enter a valid email and the correct password.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, createSession(body.email), {
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
