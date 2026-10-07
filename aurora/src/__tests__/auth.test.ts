import { createSession, isValidSession, SESSION_MAX_AGE_SECONDS, validCredentials } from '@/lib/auth';

describe('AURORA login sessions', () => {
  const originalPassword = process.env.AURORA_LOGIN_PASSWORD;

  beforeEach(() => {
    process.env.AURORA_LOGIN_PASSWORD = 'isb666';
  });

  afterAll(() => {
    if (originalPassword === undefined) delete process.env.AURORA_LOGIN_PASSWORD;
    else process.env.AURORA_LOGIN_PASSWORD = originalPassword;
  });

  it('accepts any syntactically valid email with the configured password', () => {
    expect(validCredentials('someone@example.com', 'isb666')).toBe(true);
    expect(validCredentials('another@company.org', 'isb666')).toBe(true);
    expect(validCredentials('someone@example.com', 'wrong')).toBe(false);
    expect(validCredentials('not-an-email', 'isb666')).toBe(false);
  });

  it('signs sessions and rejects tampered or expired tokens', () => {
    const now = 1_800_000_000_000;
    const token = createSession('Someone@Example.com', now);
    expect(isValidSession(token, now + 1)).toBe(true);
    expect(isValidSession(token, now + SESSION_MAX_AGE_SECONDS * 1000)).toBe(false);

    const [payload] = token.split('.');
    expect(isValidSession(`${payload}.invalid`, now + 1)).toBe(false);
    expect(isValidSession(undefined, now + 1)).toBe(false);
  });
});
