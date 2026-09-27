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
  it('uses the given fallback', () => {
    expect(safeReturnTo('https://x.example', '/')).toBe('/');
  });
});
