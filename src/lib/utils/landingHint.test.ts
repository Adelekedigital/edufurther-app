import { encodeLanding, isLanding, landingHomeFor } from './landingHint';

describe('landingHomeFor: the hint is honoured only for its own account and a mentor home', () => {
  it('the verified user’s own hint: their home, encoded or not', () => {
    const v = encodeLanding('u1', '/dashboard');
    expect(landingHomeFor(v, 'u1')).toBe('/dashboard');
    expect(landingHomeFor(encodeURIComponent(v), 'u1')).toBe('/dashboard');
  });

  it('another account’s hint (a shared device), none, or a broken one: nothing', () => {
    expect(landingHomeFor(encodeLanding('u2', '/dashboard'), 'u1')).toBeNull();
    expect(landingHomeFor(undefined, 'u1')).toBeNull();
    expect(landingHomeFor('', 'u1')).toBeNull();
    expect(landingHomeFor(':/dashboard', 'u1')).toBeNull();
    expect(landingHomeFor('%E0%A4%A', 'u1')).toBeNull();
  });

  it('never a page outside the mentor homes: no open redirect, no mentee page', () => {
    for (const home of [
      '/home',
      '/explore',
      '//evil.test',
      'https://evil.test',
      '/dashboard/../x',
    ]) {
      expect(landingHomeFor(encodeLanding('u1', home), 'u1'), home).toBeNull();
    }
  });
});

describe('isMentorHome: the onboarding homes only while their pages are on', () => {
  afterEach(() => vi.unstubAllEnvs());
  async function load(on: boolean) {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED', on ? 'true' : '');
    return import('./landingHint');
  }

  it('on: all three mentor homes', async () => {
    const { isMentorHome } = await load(true);
    expect(['/dashboard', '/mentor-application', '/onboarding/mentor'].map(isMentorHome)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('off: only the dashboard, so a stale hint never lands on a 404', async () => {
    const { isMentorHome, landingHomeFor, encodeLanding } = await load(false);
    expect(isMentorHome('/dashboard')).toBe(true);
    expect(isMentorHome('/mentor-application')).toBe(false);
    expect(landingHomeFor(encodeLanding('u1', '/onboarding/mentor'), 'u1')).toBeNull();
  });
});

describe('isLanding: a page the person opened themselves', () => {
  const h = (o: Record<string, string>) => new Headers(o);
  it('a document they opened (launch, bookmark, typed, restored tab)', () => {
    expect(isLanding(h({ 'sec-fetch-dest': 'document', 'sec-fetch-site': 'none' }))).toBe(true);
  });
  it('anything else, or no metadata at all', () => {
    expect(isLanding(h({ 'sec-fetch-dest': 'empty', 'sec-fetch-site': 'same-origin' }))).toBe(
      false,
    );
    expect(isLanding(h({ 'sec-fetch-dest': 'document', 'sec-fetch-site': 'same-origin' }))).toBe(
      false,
    );
    expect(isLanding(h({ 'sec-fetch-dest': 'document', 'sec-fetch-site': 'cross-site' }))).toBe(
      false,
    );
    expect(isLanding(h({}))).toBe(false);
  });
});
