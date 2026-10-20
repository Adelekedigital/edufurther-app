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
    expect(safeSocialUrl('instagram', 'https://instagram.com.evil.io/ada')).toBeNull();
    expect(safeSocialUrl('website', 'http://ada.dev')).toBeNull();
    expect(safeSocialUrl('website', 'javascript:alert(1)')).toBeNull();
    expect(safeSocialUrl('website', 'https://u:p@ada.dev')).toBeNull();
    // A platform a newer backend adds: skipped, never a crash.
    expect(safeSocialUrl('threads' as never, 'https://www.threads.net/@ada')).toBeNull();
  });

  it('every links platform on its own host; a website anywhere, https only', () => {
    expect(safeSocialUrl('instagram', 'https://www.instagram.com/ada.l')).toBe(
      'https://www.instagram.com/ada.l',
    );
    expect(safeSocialUrl('facebook', 'https://www.facebook.com/profile.php?id=123')).toBe(
      'https://www.facebook.com/profile.php?id=123',
    );
    expect(safeSocialUrl('tiktok', 'https://www.tiktok.com/@ada')).toBe(
      'https://www.tiktok.com/@ada',
    );
    expect(safeSocialUrl('tiktok', 'https://x.com/ada')).toBeNull();
    expect(safeSocialUrl('website', 'https://ada.medium.com/notes')).toBe(
      'https://ada.medium.com/notes',
    );
  });
});
