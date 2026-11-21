import {
  MIGRATION_2026_11,
  TARGET_LABELS,
  TOUR_COPY,
  TOUR_RELEASES,
  type TourRelease,
  type TourTarget,
} from '@/lib/copy/whatsNew';
import {
  activeReleases,
  inReplayWindow,
  releaseFor,
  REPLAY_DAYS,
  replayHref,
  SEEN_KEY,
  TOUR_HOME,
  tourMayStart,
  tourSteps,
} from './whatsNew';

const live: TourRelease = { ...MIGRATION_2026_11, enabled: true };
const ID = live.id;
const migrated = (role: 'mentee' | 'mentor' | null, seenItems: string[] | undefined = []) => ({
  role,
  isMigrated: true,
  seenItems,
});

describe('releaseFor', () => {
  it('a migrated mentee or mentor who has not seen it gets it', () => {
    expect(releaseFor(migrated('mentee'), [live])?.id).toBe(ID);
    expect(releaseFor(migrated('mentor'), [live])?.id).toBe(ID);
  });

  it('nobody gets it while its flag is off', () => {
    expect(releaseFor(migrated('mentee'), [{ ...live, enabled: false }])).toBeNull();
  });

  it('not for a new account, an unknown role, or one that has seen it', () => {
    expect(releaseFor({ ...migrated('mentee'), isMigrated: false }, [live])).toBeNull();
    expect(releaseFor({ ...migrated('mentee'), isMigrated: undefined }, [live])).toBeNull();
    expect(releaseFor(migrated(null), [live])).toBeNull();
    expect(releaseFor(migrated('mentee', [ID]), [live])).toBeNull();
  });

  it('seen in this visit counts, before the account says so', () => {
    expect(releaseFor(migrated('mentee'), [live], new Set([ID]))).toBeNull();
  });

  it('a /me without seen_items shows nothing: the answer could not be kept', () => {
    expect(releaseFor({ ...migrated('mentee'), seenItems: undefined }, [live])).toBeNull();
  });

  it('a replay ignores the seen list, never the flag or audience', () => {
    expect(releaseFor(migrated('mentee', [ID]), [live], new Set(), true)?.id).toBe(ID);
    expect(
      releaseFor({ ...migrated('mentee'), seenItems: undefined }, [live], new Set(), true)?.id,
    ).toBe(ID);
    expect(
      releaseFor(migrated('mentee'), [{ ...live, enabled: false }], new Set(), true),
    ).toBeNull();
    expect(
      releaseFor({ ...migrated('mentee'), isMigrated: false }, [live], new Set(), true),
    ).toBeNull();
  });

  it('a release with an id the backend would refuse never shows', () => {
    expect(releaseFor(migrated('mentee'), [{ ...live, id: 'Whats New!' }])).toBeNull();
  });

  it('a role the release has no content for gets nothing', () => {
    const menteeOnly = { ...live, roles: { mentee: live.roles.mentee } };
    expect(releaseFor(migrated('mentor'), [menteeOnly])).toBeNull();
  });

  it('the first unseen release wins', () => {
    const next = { ...live, id: 'whats-new:2027-01' };
    expect(releaseFor(migrated('mentee', [ID]), [live, next])?.id).toBe('whats-new:2027-01');
  });
});

describe('tourMayStart', () => {
  const ok = {
    pathname: '/home',
    role: 'mentee' as const,
    previewing: false,
    inSetup: false,
    consentBanner: false,
    otherAsk: false,
  };

  it('on the role’s Home with nothing else asking', () => {
    expect(tourMayStart(ok)).toBe(true);
    expect(tourMayStart({ ...ok, role: 'mentor', pathname: '/dashboard' })).toBe(true);
  });

  it.each([
    ['another page', { pathname: '/bookings' }],
    ['the other role’s home', { pathname: '/dashboard' }],
    ['Preview as user', { previewing: true }],
    ['onboarding or the setup lock', { inSetup: true }],
    ['the consent banner unanswered', { consentBanner: true }],
    ['another ask this visit', { otherAsk: true }],
    ['an unknown role', { role: null }],
  ])('never with %s', (_, change) => {
    expect(tourMayStart({ ...ok, ...change })).toBe(false);
  });

  it('Home is /home for mentees and /dashboard for mentors', () => {
    expect(TOUR_HOME).toEqual({ mentee: '/home', mentor: '/dashboard' });
  });
});

describe('tourSteps', () => {
  const mentee = live.roles.mentee!;
  const mentor = live.roles.mentor!;
  const all = (): 'shown' => 'shown';

  it('every step when every target is there', () => {
    expect(tourSteps(mentee, all, false)?.map((s) => s.target)).toEqual([
      'nav-home',
      'nav-bookings',
      'credits-pill',
    ]);
  });

  it('drops a step whose target is missing (no credits pill), so the count is of 2', () => {
    const steps = tourSteps(mentee, (t) => (t === 'credits-pill' ? null : 'shown'), false);
    expect(steps?.map((s) => s.target)).toEqual(['nav-home', 'nav-bookings']);
  });

  it('a missing required step holds the whole tour', () => {
    const req = { ...mentee, steps: mentee.steps.map((s) => ({ ...s, required: true })) };
    expect(tourSteps(req, (t) => (t === 'credits-pill' ? null : 'shown'), false)).toBeNull();
  });

  it('a mentor’s Sessions on a phone lives in More, and says so', () => {
    const steps = tourSteps(mentor, (t) => (t === 'nav-sessions' ? 'more' : 'shown'), true)!;
    expect(steps[1]).toMatchObject({ target: 'nav-sessions', place: 'more' });
    expect(steps[1]!.body).toMatch(/Find it under More, then Sessions\.$/);
  });

  it('on desktop the same step names Sessions only', () => {
    expect(tourSteps(mentor, all, false)![1]!.body).toMatch(/Find it under Sessions\.$/);
  });
});

describe('the off switches', () => {
  const now = Date.parse('2026-11-25T00:00:00Z');

  it('global flag off: no release at all, so no tour and no replay link', () => {
    expect(activeReleases(false, [live])).toEqual([]);
    expect(releaseFor(migrated('mentee'), activeReleases(false, [live]))).toBeNull();
    expect(replayHref(migrated('mentee'), activeReleases(false, [live]), now)).toBeUndefined();
  });

  it('a release switched off goes alone; the others still show', () => {
    const next = { ...live, id: 'whats-new:2027-01' };
    const active = activeReleases(true, [{ ...live, enabled: false }, next]);
    expect(active.map((r) => r.id)).toEqual(['whats-new:2027-01']);
    expect(releaseFor(migrated('mentee'), active)?.id).toBe('whats-new:2027-01');
  });

  it('the env flag is off unless set to "true" (default off)', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_WHATS_NEW_ENABLED', '');
    expect((await import('@/lib/config/whatsNew')).WHATS_NEW_LIVE).toBe(false);
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_WHATS_NEW_ENABLED', 'true');
    expect((await import('@/lib/config/whatsNew')).WHATS_NEW_LIVE).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe('the replay window', () => {
  const at = (iso: string) => Date.parse(iso);

  it('opens on the release day (UTC) and closes after replayDays', () => {
    expect(live.liveFrom).toBe('2026-11-23');
    expect(inReplayWindow(live, at('2026-11-22T23:59:59.999Z'))).toBe(false);
    expect(inReplayWindow(live, at('2026-11-23T00:00:00Z'))).toBe(true);
    expect(inReplayWindow(live, at('2026-12-22T23:59:59.999Z'))).toBe(true);
    expect(inReplayWindow(live, at('2026-12-23T00:00:00Z'))).toBe(false);
  });

  it('30 days unless the release says otherwise; an unreadable date is never', () => {
    const plain = { ...live, replayDays: undefined };
    expect(REPLAY_DAYS).toBe(30);
    expect(inReplayWindow(plain, at('2026-12-22T12:00:00Z'))).toBe(true);
    expect(inReplayWindow({ ...live, replayDays: 7 }, at('2026-11-30T00:00:00Z'))).toBe(false);
    expect(inReplayWindow({ ...live, liveFrom: 'soon' }, at('2026-11-24T00:00:00Z'))).toBe(false);
  });

  it('replayHref: the role’s Home with the replay query, same audience rules, seen or not', () => {
    const now = at('2026-11-25T00:00:00Z');
    expect(replayHref(migrated('mentee', [ID]), [live], now)).toBe('/home?tour=replay');
    expect(replayHref(migrated('mentor'), [live], now)).toBe('/dashboard?tour=replay');
    expect(replayHref({ ...migrated('mentee'), isMigrated: false }, [live], now)).toBeUndefined();
    expect(replayHref(migrated('mentee'), [{ ...live, enabled: false }], now)).toBeUndefined();
    expect(replayHref(migrated('mentee'), [live], at('2027-01-01T00:00:00Z'))).toBeUndefined();
  });
});

describe('the release content', () => {
  const strings = (r: TourRelease) => JSON.stringify(r.roles) + JSON.stringify(TOUR_COPY);

  it('every release id is a key the backend accepts, and unique', () => {
    const ids = TOUR_RELEASES.map((r) => r.id);
    ids.forEach((id) => expect(id).toMatch(SEEN_KEY));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each role has a welcome with three rows, steps with known targets, and a done card', () => {
    for (const r of TOUR_RELEASES)
      for (const c of Object.values(r.roles)) {
        expect(c.welcome.rows).toHaveLength(3);
        expect(c.steps.length).toBeGreaterThan(0);
        c.steps.forEach((s) => expect(TARGET_LABELS[s.target as TourTarget]).toBeTruthy());
        expect(c.done.title).toBeTruthy();
      }
  });

  it('no em dash anywhere in the copy', () => {
    TOUR_RELEASES.forEach((r) => expect(strings(r)).not.toContain('—'));
  });

  it('the welcome names the viewer', () => {
    expect(TOUR_COPY.welcomeTitle('Ada')).toBe('Welcome to the new EduFurther, Ada');
  });
});
