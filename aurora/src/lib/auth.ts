import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const AUTH_COOKIE_NAME = 'aurora_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sessionSecret(): string {
  return process.env.AURORA_SESSION_SECRET || 'aurora-local-session-secret-change-before-production';
}

export function validCredentials(email: unknown, password: unknown): email is string {
  if (typeof email !== 'string' || typeof password !== 'string') return false;
  if (!EMAIL_PATTERN.test(email.trim())) return false;

  const expected = process.env.AURORA_LOGIN_PASSWORD || 'isb666';
  const submittedHash = createHash('sha256').update(password).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(submittedHash, expectedHash);
}

export function createSession(email: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ email: email.trim().toLowerCase(), expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000 }))
    .toString('base64url');
  const signature = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function isValidSession(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return false;

  const expectedSignature = createHmac('sha256', sessionSecret()).update(payload).digest();
  let submittedSignature: Buffer;
  try {
    submittedSignature = Buffer.from(signature, 'base64url');
  } catch {
    return false;
  }
  if (submittedSignature.length !== expectedSignature.length || !timingSafeEqual(submittedSignature, expectedSignature)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: unknown; expiresAt?: unknown };
    return typeof session.email === 'string' && EMAIL_PATTERN.test(session.email) &&
      typeof session.expiresAt === 'number' && session.expiresAt > now;
  } catch {
    return false;
  }
}
