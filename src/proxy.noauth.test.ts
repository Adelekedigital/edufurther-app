import { NextRequest } from 'next/server';

// A build with no sign-in (the mock viewer, CI's page review): no session can exist.
vi.mock('@/lib/vendor/supabase/config', () => ({
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  authConfigured: false,
  COOKIE_OPTIONS: { secure: false },
}));

const { proxy } = await import('./proxy');

describe('proxy without sign-in configured', () => {
  it('never sends a members-only page to log in (the page review drives them as the mock viewer)', async () => {
    const res = await proxy(new NextRequest('https://app.test/session-types'));
    expect(res.headers.get('location')).toBeNull();
  });
});
