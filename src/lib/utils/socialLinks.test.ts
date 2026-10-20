import {
  detectSite,
  displayUrl,
  draftProblem,
  linkedInHandle,
  linkedInUrl,
  markOf,
  tidyDraft,
} from './socialLinks';

describe('tidyDraft: a pasted full link becomes its handle', () => {
  it.each([
    ['x', 'https://twitter.com/ada_l?s=20', 'ada_l'],
    ['x', 'x.com/@ada', 'ada'],
    ['youtube', 'https://www.youtube.com/@grad.path/videos', 'grad.path'],
    ['youtube', 'https://m.youtube.com/@gradpath', 'gradpath'],
    ['instagram', 'instagram.com/ada.l/', 'ada.l'],
    ['facebook', 'https://web.facebook.com/ada.obi', 'ada.obi'],
    ['facebook', 'https://www.facebook.com/profile.php?id=1234567', 'profile.php?id=1234567'],
    ['tiktok', 'https://www.tiktok.com/@ada.l', 'ada.l'],
    ['linkedin', 'https://ng.linkedin.com/in/ada-obi/details/experience', 'ada-obi'],
    ['x', '@ada', 'ada'],
  ] as const)('%s: %s → %s', (kind, raw, want) => expect(tidyDraft(kind, raw)).toBe(want));

  it('leaves a link partway through typing alone, and a website as typed', () => {
    expect(tidyDraft('x', 'https://x.c')).toBe('https://x.c');
    expect(tidyDraft('website', '  https://ada.dev/blog')).toBe('https://ada.dev/blog');
  });
});

describe('draftProblem', () => {
  it('a handle with spaces or slashes: the design’s note', () => {
    expect(draftProblem('x', 'ada l')).toBe('shape');
    expect(draftProblem('instagram', 'ada/l')).toBe('shape');
    expect(draftProblem('linkedin', 'in/ada')).toBe('shape');
  });

  it('each platform’s own handle rule (the backend’s)', () => {
    expect(draftProblem('x', 'a'.repeat(16))).toBe('handle');
    expect(draftProblem('x', 'settings')).toBe('handle');
    expect(draftProblem('x', 'ada_l')).toBeNull();
    expect(draftProblem('youtube', 'ab')).toBe('handle');
    expect(draftProblem('instagram', '.ada')).toBe('handle');
    expect(draftProblem('instagram', 'reels')).toBe('handle');
    expect(draftProblem('facebook', 'ada')).toBe('handle');
    expect(draftProblem('facebook', 'profile.php?id=123')).toBeNull();
    expect(draftProblem('tiktok', 'ada.')).toBe('handle');
    expect(draftProblem('linkedin', 'ab')).toBe('handle');
    expect(draftProblem('linkedin', 'adé-obi')).toBeNull();
  });

  it('a website: a web address with a dot, http(s) or no scheme', () => {
    expect(draftProblem('website', 'ada')).toBe('website');
    expect(draftProblem('website', 'ftp://ada.dev')).toBe('website');
    expect(draftProblem('website', 'https://u@ada.dev')).toBe('website');
    expect(draftProblem('website', 'ada.dev:8080')).toBe('website');
    expect(draftProblem('website', 'ada.dev/blog?x=1')).toBeNull();
    expect(draftProblem('website', 'https://ada.medium.com')).toBeNull();
    // An internationalised name, as its IDNA form; an underscore isn't a host.
    expect(draftProblem('website', 'café.fr')).toBeNull();
    expect(draftProblem('website', 'my_site.example.com')).toBe('website');
  });

  it('nothing typed yet is no problem to show', () => expect(draftProblem('x', '  ')).toBeNull());
});

describe('showing a link', () => {
  it('a website on Medium or Substack shows their mark (the design’s DETECT)', () => {
    expect(markOf('website', 'https://ada.medium.com/notes')).toBe('medium');
    expect(markOf('website', 'https://medium.com/@ada')).toBe('medium');
    expect(markOf('website', 'https://ada.substack.com')).toBe('substack');
    expect(markOf('website', 'https://ada.dev')).toBe('website');
    expect(markOf('x', 'https://x.com/ada')).toBe('x');
    // Not fooled by a lookalike host.
    expect(markOf('website', 'https://medium.com.evil.io')).toBe('website');
  });

  it('detectSite names the platform a website draft really is', () => {
    expect(detectSite('https://x.com/ada')).toBe('x');
    expect(detectSite('www.youtube.com/@ada')).toBe('youtube');
    expect(detectSite('ada.dev')).toBeNull();
  });

  it('displayUrl drops the scheme, www and a trailing slash', () =>
    expect(displayUrl('https://www.youtube.com/@ada/')).toBe('youtube.com/@ada'));

  it('LinkedIn: the handle out of a saved link, and back', () => {
    expect(linkedInHandle('https://www.linkedin.com/in/ad%C3%A9-obi')).toBe('adé-obi');
    expect(linkedInUrl('adé-obi')).toBe('https://www.linkedin.com/in/ad%C3%A9-obi');
    expect(linkedInHandle('https://evil.io/in/ada')).toBeNull();
  });
});
