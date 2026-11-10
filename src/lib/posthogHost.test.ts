import { posthogHosts } from './posthogHost';

describe('posthogHosts', () => {
  it('nothing without POSTHOG_HOST: nothing loads', () => {
    expect(posthogHosts({})).toBeNull();
  });

  it('derives the assets host for PostHog Cloud in any region', () => {
    expect(posthogHosts({ POSTHOG_HOST: 'https://eu.i.posthog.com/' })).toEqual({
      api: 'https://eu.i.posthog.com',
      assets: 'https://eu-assets.i.posthog.com',
    });
  });

  it('takes an explicit assets host', () => {
    expect(
      posthogHosts({
        POSTHOG_HOST: 'https://ph.example.com',
        POSTHOG_ASSETS_HOST: 'https://cdn.example.com',
      }),
    ).toEqual({ api: 'https://ph.example.com', assets: 'https://cdn.example.com' });
  });

  it('refuses plain http (but localhost) and non-URLs', () => {
    expect(() => posthogHosts({ POSTHOG_HOST: 'http://ph.example.com' })).toThrow(/https/);
    expect(() => posthogHosts({ POSTHOG_HOST: 'nope' })).toThrow(/not a URL/);
    expect(posthogHosts({ POSTHOG_HOST: 'http://localhost:9999' })?.api).toBe(
      'http://localhost:9999',
    );
  });
});
