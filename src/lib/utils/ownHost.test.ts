import { isOwnHost, isSignInHost, referralHost } from './ownHost';

describe('isOwnHost', () => {
  it.each([
    'edufurther.org',
    'EduFurther.org',
    'www.edufurther.org',
    'staging.edufurther.org',
    'localhost',
    '127.0.0.1',
    'edufurther-app.vercel.app',
    'edufurther-app-abc123-team.vercel.app',
    'edufurther-app-git-feat-x-team.vercel.app',
  ])('%s is ours', (host) => {
    expect(isOwnHost(host)).toBe(true);
  });

  it('the app’s own host, wherever it is deployed', () => {
    expect(isOwnHost('app.example.test', 'app.example.test')).toBe(true);
  });

  it.each([
    'l.instagram.com',
    'notedufurther.org',
    'edufurther.org.evil.com',
    'other-app.vercel.app',
    'vercel.app',
    '',
  ])('%j is not', (host) => {
    expect(isOwnHost(host, 'app.edufurther.org')).toBe(false);
  });
});

describe('referralHost: who sent the visitor, if anyone did', () => {
  const env = process.env.NEXT_PUBLIC_SUPABASE_URL;
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.test';
  });
  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = env;
  });

  it('an outside page: its bare host', () => {
    expect(referralHost('https://www.linkedin.com:443/feed/?x=1', 'app.edufurther.org')).toBe(
      'www.linkedin.com',
    );
  });

  it.each([
    ['Google’s sign-in', 'https://accounts.google.com/o/oauth2'],
    ['our Supabase auth host', 'https://proj.supabase.test/auth/v1/callback'],
    ['the app’s own sign-in', 'https://app.edufurther.org/login?auth=google'],
    ['the app’s auth callback', 'https://app.edufurther.org/auth/callback'],
    ['the landing site', 'https://edufurther.org/'],
    ['nothing', ''],
    ['not a URL', 'not a url'],
  ])('%s is no referral', (_name, url) => {
    expect(referralHost(url, 'app.edufurther.org')).toBeUndefined();
  });

  it('the auth host comes from the configured Supabase URL, not a fixed name', () => {
    expect(isSignInHost('proj.supabase.test')).toBe(true);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://other.supabase.test';
    expect(isSignInHost('proj.supabase.test')).toBe(false);
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(isSignInHost('proj.supabase.test')).toBe(false);
  });
});
