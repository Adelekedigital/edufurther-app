import { SUPPORT_EMAIL } from '@/lib/config/support';
import { supportMailto } from './mailto';

describe('supportMailto', () => {
  it('goes to the one support address', () => {
    expect(SUPPORT_EMAIL).toBe('support@edufurther.org');
    expect(supportMailto()).toBe('mailto:support@edufurther.org');
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
