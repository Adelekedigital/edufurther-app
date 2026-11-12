import { loginPathFor, loginRequired } from './loginRequired';

describe('loginRequired: which pages a signed-out visitor is sent to log in for', () => {
  it.each([
    '/home',
    '/dashboard',
    '/bookings',
    '/sessions/3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90',
    '/messages',
    '/settings',
    '/settings/security',
    '/calendar',
    '/integrations',
    '/session-types',
    '/session-types/new',
    '/admin',
    '/admin/analytics',
    '/mentor-application',
    '/onboarding',
    '/onboarding/mentor',
  ])('%s: members only', (path) => {
    expect(loginRequired(path)).toBe(true);
  });

  it.each(['/', '/explore', '/mentors/ada-l', '/invite/damilola-7k2x', '/login', '/signup'])(
    '%s: open to guests (owner, 2026-11-12)',
    (path) => {
      expect(loginRequired(path)).toBe(false);
    },
  );

  it('an unknown path is not a page: the 404, never a login', () => {
    expect(loginRequired('/no-such-page')).toBe(false);
    expect(loginRequired('/sessions/abc/enter')).toBe(false);
    expect(loginRequired('/auth/callback')).toBe(false);
  });

  it('sends them back to the page, query included, after logging in', () => {
    expect(loginPathFor('/bookings', '?tab=past')).toBe('/login?next=%2Fbookings%3Ftab%3Dpast');
  });
});
