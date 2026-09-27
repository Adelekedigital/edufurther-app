import { safeSocialUrl } from './socialUrl';

describe('safeSocialUrl', () => {
  it('keeps canonical https links on the network’s own host', () => {
    expect(safeSocialUrl('linkedin', 'https://www.linkedin.com/in/gbenga')).toBe(
      'https://www.linkedin.com/in/gbenga',
    );
    expect(safeSocialUrl('x', 'https://x.com/gbenga')).toBe('https://x.com/gbenga');
    expect(safeSocialUrl('youtube', 'https://www.youtube.com/@gbenga')).toBe(
      'https://www.youtube.com/@gbenga',
    );
  });

  it('renders nothing for anything else', () => {
    expect(safeSocialUrl('linkedin', 'javascript:alert(1)')).toBeNull();
    expect(safeSocialUrl('linkedin', 'http://www.linkedin.com/in/x')).toBeNull();
    expect(safeSocialUrl('linkedin', 'https://linkedin.com.evil.io/in/x')).toBeNull();
    expect(safeSocialUrl('linkedin', 'https://evil.io/?u=linkedin.com')).toBeNull();
    expect(safeSocialUrl('x', 'https://user:pw@x.com/a')).toBeNull();
    expect(safeSocialUrl('youtube', 'gbenga')).toBeNull();
    expect(safeSocialUrl('youtube', 'https://x.com/gbenga')).toBeNull();
    expect(safeSocialUrl('x', null)).toBeNull();
  });
});
