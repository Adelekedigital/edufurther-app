import { hasContactDetails, maskContactDetails } from './contactDetails';

describe('hasContactDetails (the design’s CONTACT_RE)', () => {
  it.each([
    ['an email', 'write to ada@mail.com', true],
    ['a phone number', 'call +234 803 123 4567', true],
    ['a year and a time', 'Fall 2027 at 3pm', false],
    ['plain words', 'See you on Tuesday', false],
  ])('%s', (_, text, hit) => {
    expect(hasContactDetails(text)).toBe(hit);
  });
});

describe('maskContactDetails (error reports)', () => {
  it('masks every email and phone number, and leaves the rest', () => {
    expect(
      maskContactDetails('Mail ada@example.com or call +234 803 123 4567, then ada@x.io'),
    ).toBe('Mail [redacted] or call [redacted], then [redacted]');
    expect(maskContactDetails('Nothing here')).toBe('Nothing here');
  });
});
