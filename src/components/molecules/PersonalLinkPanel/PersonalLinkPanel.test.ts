import { isMeetingLink } from './PersonalLinkPanel';

/**
 * The point of checking here is that the error beats the request. That only
 * works if we are as strict as the backend, which takes https, no credentials,
 * and a real host.
 */
describe('isMeetingLink', () => {
  it.each([
    'https://meet.google.com/abc-defg-hij',
    'https://zoom.us/j/123',
    'https://a.co/x',
  ])('accepts %s', (url) => expect(isMeetingLink(url)).toBe(true));

  it.each([
    ['http, which the backend refuses outright', 'http://meet.example.com/room'],
    ['a bare IP', 'https://127.0.0.1/room'],
    ['a trailing dot', 'https://a./room'],
    ['a lone dot', 'https://./room'],
    ['a numeric TLD', 'https://example.123/room'],
    ['no host at all', 'https:///room'],
    ['not a url', 'meet.example.com'],
    ['empty', ''],
  ])('rejects %s', (_why, url) => expect(isMeetingLink(url)).toBe(false));

  /** This link goes out in every mentee's invite. */
  it('rejects credentials rather than mailing them to every mentee', () => {
    expect(isMeetingLink('https://user:pass@meet.example.com/room')).toBe(false);
    expect(isMeetingLink('https://user@meet.example.com/room')).toBe(false);
  });
});
