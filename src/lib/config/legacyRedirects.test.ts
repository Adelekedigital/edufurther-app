import { LEGACY_REDIRECTS } from './legacyRedirects';

describe('LEGACY_REDIRECTS', () => {
  it('sends the marketing site\'s "Sign up" link to sign-up, ahead of the plain /authpage rule', () => {
    const auth = LEGACY_REDIRECTS.filter((r) => r.source === '/authpage');
    expect(auth[0]).toMatchObject({
      destination: '/signup',
      has: [{ type: 'query', key: 'authtype', value: 'newuser' }],
    });
    // Next takes the first match, so the query rule must come first.
    expect(auth[1]).toMatchObject({ destination: '/login' });
    expect(auth[1]).not.toHaveProperty('has');
  });

  it("only redirects to this app's own pages", () => {
    for (const r of LEGACY_REDIRECTS) expect(r.destination).toMatch(/^\/[a-z]*$/);
  });
});
