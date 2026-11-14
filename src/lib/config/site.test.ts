import { siteBase } from './site';

describe('siteBase', () => {
  it('reads the configured address', () => {
    expect(siteBase('https://staging.edufurther.org')?.origin).toBe(
      'https://staging.edufurther.org',
    );
  });

  it.each([undefined, '', '  ', 'not a url', 'ftp://edufurther.org'])(
    'unset or unusable (%s): no base, so Next keeps its own default',
    (raw) => {
      expect(siteBase(raw)).toBeUndefined();
    },
  );
});
