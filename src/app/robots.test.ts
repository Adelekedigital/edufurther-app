import robots from './robots';

afterEach(() => vi.unstubAllEnvs());

describe('robots.txt', () => {
  it('keeps every crawler out unless the site opts in', () => {
    expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' });
  });

  it('opted in: only home, Explore and mentor profiles', () => {
    vi.stubEnv('SITE_INDEXABLE', 'true');
    expect(robots().rules).toEqual({
      userAgent: '*',
      allow: ['/$', '/explore', '/mentors/'],
      disallow: '/',
    });
  });
});
