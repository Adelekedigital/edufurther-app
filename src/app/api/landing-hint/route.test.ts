// @vitest-environment node
import { NextRequest } from 'next/server';
import { LANDING_COOKIE, landingHomeFor } from '@/lib/utils/landingHint';

const h = vi.hoisted(() => ({ userId: 'sub-1' as string | null }));
vi.mock('@/lib/vendor/supabase/server', () => ({ verifiedUserId: async () => h.userId }));

const { PUT, DELETE } = await import('./route');

const put = (body: unknown, headers: Record<string, string> = {}) =>
  PUT(
    new NextRequest('https://app.test/api/landing-hint', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', origin: 'https://app.test', ...headers },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  h.userId = 'sub-1';
});

describe('/api/landing-hint', () => {
  it('saves the home for the user the server verified: HttpOnly, a year, and read back by the proxy', async () => {
    const res = await put({ home: '/dashboard' });
    expect(res.status).toBe(204);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const set = res.headers.get('set-cookie') ?? '';
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/Secure/i);
    expect(set).toMatch(/SameSite=lax/i);
    expect(set).toMatch(/Max-Age=31536000/);
    // The proxy's reader accepts it for the same Supabase user, and only them.
    const value = res.cookies.get(LANDING_COOKIE)?.value;
    expect(landingHomeFor(value, 'sub-1')).toBe('/dashboard');
    expect(landingHomeFor(value, 'sub-2')).toBeNull();
  });

  it('signed out: nothing saved', async () => {
    h.userId = null;
    const res = await put({ home: '/dashboard' });
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('anything but a mentor home, or no body: refused', async () => {
    for (const body of [{ home: '/home' }, { home: '//evil.test' }, { home: 1 }, {}, null]) {
      const res = await put(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.headers.get('set-cookie')).toBeNull();
    }
  });

  it('another site’s page can’t set or clear it', async () => {
    expect((await put({ home: '/dashboard' }, { origin: 'https://evil.test' })).status).toBe(403);
    const del = await DELETE(
      new NextRequest('https://app.test/api/landing-hint', {
        method: 'DELETE',
        headers: { origin: 'https://evil.test' },
      }),
    );
    expect(del.status).toBe(403);
  });

  it('DELETE clears it', async () => {
    const res = await DELETE(
      new NextRequest('https://app.test/api/landing-hint', { method: 'DELETE' }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toMatch(/ef-landing=;.*Max-Age=0/i);
  });
});
