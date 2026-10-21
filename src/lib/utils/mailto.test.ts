import { DEFAULT_SUPPORT_EMAIL } from '@/lib/config/support';
import { supportMailto } from './mailto';

describe('supportMailto', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('goes to the configured support address', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', ' help@example.org ');
    expect(supportMailto()).toBe('mailto:help@example.org');
  });
  it('falls back to the default when the config is unset or not an address', () => {
    expect(DEFAULT_SUPPORT_EMAIL).toBe('support@edufurther.org');
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', '');
    expect(supportMailto()).toBe('mailto:support@edufurther.org');
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', 'not an address');
    expect(supportMailto()).toBe('mailto:support@edufurther.org');
    // Anything that would add a header or a second recipient to the mailto.
    for (const v of ['a@b.co?cc=x@y.zz', 'a@b.co&bcc=x', 'a@b.co#x', 'a,e@x.yz', 'a%40@b.co'])
      expect((vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', v), supportMailto())).toBe(
        'mailto:support@edufurther.org',
      );
  });
  it('prefills the subject and body, encoded', () => {
    expect(supportMailto('A & B', 'Hi,\nthanks')).toBe(
      'mailto:support@edufurther.org?subject=A%20%26%20B&body=Hi%2C%0Athanks',
    );
    expect(supportMailto(undefined, 'Body only')).toBe(
      'mailto:support@edufurther.org?body=Body%20only',
    );
  });
});
