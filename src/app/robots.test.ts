import robots from './robots';

afterEach(() => vi.unstubAllEnvs());

type Rule = {
  userAgent?: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
};
const rules = () => robots().rules as Rule[];
const previewRule = () => rules().find((r) => Array.isArray(r.userAgent))!;

describe('robots.txt', () => {
  it('keeps search out unless the site opts in', () => {
    expect(rules().at(-1)).toEqual({ userAgent: '*', disallow: '/' });
  });

  it('opted in: search gets only home, Explore and mentor profiles', () => {
    vi.stubEnv('SITE_INDEXABLE', 'true');
    expect(rules().at(-1)).toEqual({
      userAgent: '*',
      allow: ['/$', '/explore', '/mentors/'],
      disallow: '/',
    });
  });

  it.each([undefined, 'true'])(
    'link previews (LinkedIn among them) read the shared pages and nothing else (SITE_INDEXABLE=%s)',
    (indexable) => {
      if (indexable) vi.stubEnv('SITE_INDEXABLE', indexable);
      const p = previewRule();
      expect(p.userAgent).toEqual(
        expect.arrayContaining(['LinkedInBot', 'WhatsApp', 'Twitterbot']),
      );
      expect(p.allow).toEqual(['/mentors/', '/invite/', '/og/']);
      expect(p.disallow).toBe('/');
    },
  );
});
