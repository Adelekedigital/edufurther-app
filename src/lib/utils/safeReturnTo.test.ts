import { safeReturnTo } from './safeReturnTo';

describe('safeReturnTo', () => {
  it('keeps local paths with their query and hash', () => {
    expect(safeReturnTo('/explore?book=m-1#top')).toBe('/explore?book=m-1#top');
  });
  it.each([
    'https://evil.example/',
    '//evil.example/x',
    '/\\evil.example',
    'javascript:alert(1)',
    'explore',
    '',
    null,
    undefined,
  ])('falls back for %s', (v) => {
    expect(safeReturnTo(v)).toBe('/explore');
  });
  // Security review, PR #8: these normalise to `//evil.com` inside the URL parser.
  it.each([
    '/.//evil.com',
    '/%2e//evil.com',
    '/%2E%2E//evil.com',
    '/..//evil.com',
    '/a/..//evil.com',
    '/./\t/evil.com',
    '/\n/evil.com',
  ])('rejects %j, which normalises to a protocol-relative URL', (v) => {
    expect(safeReturnTo(v)).toBe('/explore');
  });
  it('still keeps ordinary paths with dots in names', () => {
    expect(safeReturnTo('/mentors/ada.o?x=1.5')).toBe('/mentors/ada.o?x=1.5');
  });
  it('uses the given fallback', () => {
    expect(safeReturnTo('https://x.example', '/')).toBe('/');
  });
});
