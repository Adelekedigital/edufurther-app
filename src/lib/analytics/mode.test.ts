import { CONSENT_VERSION } from './consent';
import { analyticsMode, bannerShown, replayAllowed } from './mode';

const yes = { granted: true, version: CONSENT_VERSION, answeredAt: 1 };
const no = { ...yes, granted: false };
const old = { ...yes, version: 'old' };

describe('the flag and consent matrix', () => {
  it.each([
    // analytics, banner, key, preview, answer → mode, banner shown
    [false, false, true, false, null, 'off', false],
    [false, true, true, false, yes, 'off', false],
    [true, false, true, false, null, 'cookieless', false],
    // Banner off: a stored Accept (the landing site) still gives cookieless only.
    [true, false, true, false, yes, 'cookieless', false],
    [true, true, true, false, null, 'cookieless', true],
    [true, true, true, false, no, 'cookieless', false],
    [true, true, true, false, yes, 'identified', false],
    [true, true, true, false, old, 'cookieless', true],
    // No key: nothing loads; the banner still asks (the answer is kept).
    [true, true, false, false, null, 'off', true],
    // A preview sends nothing and asks nothing, whatever was answered.
    [true, true, true, true, yes, 'off', false],
    [true, true, true, true, null, 'off', false],
  ] as const)(
    'analytics %s, banner %s, key %s, preview %s, answer %j',
    (analyticsOn, bannerOn, keySet, previewing, answer, mode, shown) => {
      const i = { analyticsOn, bannerOn, keySet, previewing, answer };
      expect(analyticsMode(i)).toBe(mode);
      expect(bannerShown(i)).toBe(shown);
    },
  );
});

describe('replayAllowed', () => {
  it.each(['/onboarding', '/onboarding/mentee', '/onboarding/mentor'])('records %s', (p) =>
    expect(replayAllowed(p)).toBe(true),
  );

  it.each([
    '/messages',
    '/explore',
    '/mentors/ada-o',
    '/onboardingx',
    '/settings',
    '/bookings',
    '/sessions/1',
    '/mentors',
    '/explorer',
    '/home',
    '/',
  ])('never records %s', (p) => expect(replayAllowed(p)).toBe(false));
});
