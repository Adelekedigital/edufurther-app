import { authPageParams } from './pageParams';

describe('authPageParams', () => {
  it('reads the mentor role on sign-up only', () => {
    expect(authPageParams({ role: 'mentor' }, 'signup').role).toBe('mentor');
    expect(authPageParams({ role: 'mentor' }, 'login').role).toBe('mentee');
    expect(authPageParams({ role: 'admin' }, 'signup').role).toBe('mentee');
  });

  it('keeps only a same-site next', () => {
    expect(authPageParams({ next: '/mentors/gbenga' }, 'login').next).toBe('/mentors/gbenga');
    // A next that fails the check is ignored, not swapped for a default page.
    expect(authPageParams({ next: '//evil.com' }, 'login').next).toBeNull();
    expect(authPageParams({}, 'login').next).toBeNull();
    expect(authPageParams({ next: ['/a', '/b'] }, 'login').next).toBeNull();
  });

  it('tells a Google return from a Google failure, and ignores a dead link', () => {
    expect(authPageParams({ auth: 'google' }, 'login').google).toBe('returned');
    expect(authPageParams({ error: 'google_cancelled' }, 'login').google).toBe('failed');
    expect(authPageParams({ error: 'google_failed' }, 'signup').google).toBe('failed');
    expect(authPageParams({ error: 'link' }, 'login').google).toBeUndefined();
    expect(authPageParams({ error: 'nonsense' }, 'login').google).toBeUndefined();
  });

  it('a deleted account’s landing: ?deleted=1 on /login only', () => {
    expect(authPageParams({ deleted: '1' }, 'login').deleted).toBe(true);
    expect(authPageParams({ deleted: 'yes' }, 'login').deleted).toBe(false);
    expect(authPageParams({ deleted: ['1', '1'] }, 'login').deleted).toBe(false);
    expect(authPageParams({ deleted: '1' }, 'signup').deleted).toBe(false);
  });
});
