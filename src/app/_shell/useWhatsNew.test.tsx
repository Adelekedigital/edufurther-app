import { act, renderHook } from '@testing-library/react';
import type { Access } from '@/lib/utils/access';
import type { Viewer } from '@/types/mentor';

const h = vi.hoisted(() => ({
  track: vi.fn(),
  markSeen: vi.fn(),
  claim: vi.fn(() => true),
  free: vi.fn(() => true),
  banner: false,
  search: '',
  on: true,
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(h.search),
}));
vi.mock('@/lib/config/whatsNew', () => ({
  get WHATS_NEW_LIVE() {
    return h.on;
  },
}));
vi.mock('@/lib/analytics/track', () => ({ track: h.track }));
vi.mock('@/lib/analytics/bannerState', () => ({ useConsentBannerShown: () => h.banner }));
vi.mock('@/lib/api/data/seenItems', () => ({
  useMarkSeen: () => h.markSeen,
  useSeenHere: () => new Set<string>(),
}));
vi.mock('@/lib/pwa/installNudge', () => ({
  claimVisitForTour: h.claim,
  visitFreeForTour: h.free,
}));
const { useWhatsNew, tourReplay, SETTLE_MS } = await import('./useWhatsNew');

type Member = Extract<Viewer, { kind: 'member' }>;
const ID = 'whats-new:2026-11-migration';
const member = (over: Partial<Member> = {}) =>
  ({
    kind: 'member',
    id: 'u-1',
    firstName: 'Ada',
    isMentor: false,
    isMigrated: true,
    seenItems: [],
    ...over,
  }) as Member;
const open: Access = {
  state: 'none',
  locked: new Set(),
  copy: null,
  homeHref: null,
  setupPill: false,
};
const setup = { ...open, state: 'menteeSetup' } as Access;

function host(props: Partial<Parameters<typeof useWhatsNew>[0]> = {}) {
  return renderHook((p: Parameters<typeof useWhatsNew>[0]) => useWhatsNew(p), {
    initialProps: {
      member: member(),
      access: open,
      previewing: false,
      pathname: '/home',
      ...props,
    },
  });
}
const settle = () => act(() => vi.advanceTimersByTimeAsync(SETTLE_MS + 50));

beforeEach(() => {
  vi.useFakeTimers({ now: Date.parse('2026-11-25T12:00:00Z') });
  Object.values(h).forEach((f) => typeof f === 'function' && 'mockClear' in f && f.mockClear());
  h.claim.mockReturnValue(true);
  h.free.mockReturnValue(true);
  h.banner = false;
});
afterEach(() => vi.useRealTimers());

describe('useWhatsNew: the global switch', () => {
  it('NEXT_PUBLIC_WHATS_NEW_ENABLED off: nothing is due, nothing opens, the push ask is free', async () => {
    h.on = false;
    try {
      const { result } = host();
      expect(result.current.holding).toBe(false);
      await settle();
      expect(result.current.tour).toBeNull();
      expect(h.claim).not.toHaveBeenCalled();
    } finally {
      h.on = true;
    }
  });
});

describe('useWhatsNew: when it opens', () => {
  it('a migrated mentee on Home: due at once (push ask held), open after a beat', async () => {
    const { result } = host();
    expect(result.current.holding).toBe(true);
    expect(result.current.tour).toBeNull();
    await settle();
    expect(result.current.tour?.first).toBe('Ada');
    expect(result.current.tour?.content.steps[0]?.target).toBe('nav-home');
    // Checked before the tour loads, claimed only once it is on screen.
    expect(h.free).toHaveBeenCalled();
    expect(h.claim).not.toHaveBeenCalled();
    await act(async () => result.current.tour!.onEvent({ type: 'opened' }));
    await vi.waitFor(() => expect(h.claim).toHaveBeenCalledTimes(1));
  });

  it('a mentor on /dashboard gets the mentor version', async () => {
    const { result } = host({
      member: member({ isMentor: true, isApprovedMentor: true }),
      pathname: '/dashboard',
    });
    await settle();
    expect(result.current.tour?.content.steps[0]?.target).toBe('nav-calendar');
  });

  it.each([
    ['off Home', { pathname: '/bookings' }],
    ['in Preview as user', { previewing: true }],
    ['in the setup lock', { access: setup }],
    ['for an admin', { member: member({ isAdmin: true }) }],
    ['while /me loads', { member: null }],
    [
      'when it is not known where the account was made',
      { member: member({ isMigrated: undefined }) },
    ],
    [
      'for a mentor applicant not yet approved',
      { member: member({ isMentor: true }), pathname: '/dashboard' },
    ],
    ['for a mentee mid-onboarding', { member: member({ onboardingComplete: false }) }],
    ['once seen', { member: member({ seenItems: [ID] }) }],
  ])('never %s', async (_, props) => {
    const { result } = host(props);
    expect(result.current.holding).toBe(false);
    await settle();
    expect(result.current.tour).toBeNull();
  });

  it('not before the release day; after the replay window it still opens, without the replay line', async () => {
    vi.setSystemTime(Date.parse('2026-11-20T23:00:00Z'));
    const early = host();
    expect(early.result.current.holding).toBe(false);
    early.unmount();
    vi.setSystemTime(Date.parse('2027-02-01T09:00:00Z'));
    const late = host();
    await settle();
    expect(late.result.current.tour?.replayable).toBe(false);
  });

  it('inside the replay window the tour says it can be replayed', async () => {
    const { result } = host();
    await settle();
    expect(result.current.tour?.replayable).toBe(true);
  });

  it('waits for the consent banner to be answered', async () => {
    h.banner = true;
    const { result, rerender } = host();
    await settle();
    expect(result.current.tour).toBeNull();
    h.banner = false;
    rerender({
      member: member(),
      access: open,
      previewing: false,
      pathname: '/home',
    });
    await settle();
    expect(result.current.tour).not.toBeNull();
  });

  it('an install nudge or ask already had this visit: the tour waits for the next', async () => {
    h.free.mockReturnValue(false);
    const { result } = host();
    await settle();
    expect(result.current.tour).toBeNull();
    expect(result.current.holding).toBe(false);
  });
});

describe('useWhatsNew: the Welcome tour (an account made here)', () => {
  const WELCOME = 'welcome:2026-11';

  it.each([
    ['a mentee on /home', member({ isMigrated: false }), '/home', 'mentee', 'nav-home'],
    [
      'an approved mentor on /dashboard',
      member({ isMigrated: false, isMentor: true, isApprovedMentor: true }),
      '/dashboard',
      'mentor',
      'nav-calendar',
    ],
  ] as const)(
    '%s: its own words, its own seen key and analytics',
    async (_, m, pathname, role, first) => {
      const { result } = host({ member: m, pathname });
      await settle();
      const tour = result.current.tour!;
      expect(tour.labels.badge).toBe('Welcome');
      expect(tour.labels.welcomeTitle(tour.first)).toBe('Welcome to EduFurther, Ada');
      expect(tour.content.steps[0]?.target).toBe(first);
      expect(tour.replayable).toBe(true);
      act(() => tour.onEvent({ type: 'started' }));
      expect(h.track).toHaveBeenCalledWith('tour_started', {
        release: WELCOME,
        role,
        replay: false,
      });
      act(() => tour.onEvent({ type: 'skipped', step: 1 }));
      expect(h.markSeen).toHaveBeenLastCalledWith(WELCOME);
      act(() => tour.onEvent({ type: 'finished' }));
      expect(h.markSeen).toHaveBeenCalledTimes(2);
      expect(h.markSeen).toHaveBeenLastCalledWith(WELCOME);
    },
  );

  it('a migrated mentee still gets What’s new, in its own words', async () => {
    const { result } = host();
    await settle();
    expect(result.current.tour?.labels.badge).toBe('New platform');
    expect(result.current.tour?.labels.welcomeTitle('Ada')).toBe(
      'Welcome to the new EduFurther, Ada',
    );
  });
});

describe('useWhatsNew: what each answer does', () => {
  it('tracks each event with the release and role, and marks seen on skip or finish', async () => {
    const { result } = host();
    await settle();
    const tour = result.current.tour!;
    act(() => tour.onEvent({ type: 'started' }));
    act(() => tour.onEvent({ type: 'step', step: 1, target: 'nav-home' }));
    act(() => tour.onEvent({ type: 'skipped', step: 1 }));
    const base = { release: ID, role: 'mentee' };
    expect(h.track).toHaveBeenCalledWith('tour_started', { ...base, replay: false });
    expect(h.track).toHaveBeenCalledWith('tour_step_viewed', {
      ...base,
      step: 1,
      target: 'nav-home',
    });
    expect(h.track).toHaveBeenCalledWith('tour_skipped', { ...base, step: 1 });
    expect(h.markSeen).toHaveBeenCalledWith(ID);

    // Finish marks it seen; the done card's close is what's counted, with how.
    act(() => tour.onEvent({ type: 'finished' }));
    expect(h.markSeen).toHaveBeenCalledTimes(2);
    expect(h.track).not.toHaveBeenCalledWith('tour_completed', expect.anything());
    act(() => tour.onEvent({ type: 'completed', action: 'cta' }));
    expect(h.track).toHaveBeenCalledWith('tour_completed', { ...base, action: 'cta' });
    act(() => tour.onEvent({ type: 'completed', action: 'dismiss' }));
    expect(h.track).toHaveBeenCalledWith('tour_completed', { ...base, action: 'dismiss' });
    expect(h.markSeen).toHaveBeenCalledTimes(2);
  });

  it('onMore holds the shell’s More sheet; closing lets it go', async () => {
    const { result } = host();
    await settle();
    act(() => result.current.tour!.onMore(true));
    expect(result.current.more).toBe(true);
    act(() => result.current.tour!.onClose());
    expect(result.current.more).toBe(false);
    expect(result.current.tour).toBeNull();
  });
});

describe('tourReplay', () => {
  const DAY2 = Date.parse('2026-11-24T10:00:00Z');

  it('in the window, even once seen: their Home with the replay query', () => {
    expect(tourReplay(member({ seenItems: [ID] }), false, DAY2)?.href).toBe('/home?tour=replay');
    expect(tourReplay(member({ isMentor: true, isApprovedMentor: true }), false, DAY2)?.href).toBe(
      '/dashboard?tour=replay',
    );
  });

  it('not before the release day or after its replay window (to 23 Dec)', () => {
    expect(tourReplay(member(), false, Date.parse('2026-11-20T23:59:59Z'))).toBeUndefined();
    expect(tourReplay(member(), false, Date.parse('2026-12-23T00:00:00Z'))).toBeUndefined();
  });

  it('a migrated account’s is named What’s new; an account made here gets the Welcome tour’s, with no end', () => {
    expect(tourReplay(member(), false, DAY2)?.labels).toMatchObject({
      menuItem: 'What’s new',
      replayTitle: 'What’s new',
      replaySub: 'A quick look at what changed on EduFurther.',
    });
    const later = Date.parse('2028-06-01T00:00:00Z');
    const made = tourReplay(member({ isMigrated: false }), false, later);
    expect(made?.href).toBe('/home?tour=replay');
    expect(made?.labels).toMatchObject({
      menuItem: 'Welcome tour',
      replayTitle: 'Welcome tour',
      replaySub: 'A quick look at where everything is.',
    });
  });

  it('not offered when it is unknown where the account was made, to an admin, or in Preview as user', () => {
    expect(tourReplay(member({ isMigrated: undefined }), false, DAY2)).toBeUndefined();
    expect(tourReplay(member({ isAdmin: true }), false, DAY2)).toBeUndefined();
    expect(tourReplay(member(), true, DAY2)).toBeUndefined();
    expect(tourReplay(null, false, DAY2)).toBeUndefined();
  });

  it('Home with ?tour=replay opens the welcome for someone who has seen it, and drops the query', async () => {
    h.search = 'tour=replay&mockViewer=mentee';
    window.history.replaceState(null, '', '/home?tour=replay&mockViewer=mentee');
    const { result } = host({ member: member({ seenItems: [ID] }) });
    await settle();
    expect(window.location.search).toBe('?mockViewer=mentee');
    expect(result.current.tour).not.toBeNull();
    await act(async () => result.current.tour!.onEvent({ type: 'opened' }));
    expect(h.free).not.toHaveBeenCalled();
    expect(h.claim).not.toHaveBeenCalled();
    act(() => result.current.tour!.onEvent({ type: 'started' }));
    expect(h.track).toHaveBeenCalledWith('tour_started', {
      release: ID,
      role: 'mentee',
      replay: true,
    });
    // A replay's Skip counts as seen too (the record only grows; idempotent).
    act(() => result.current.tour!.onEvent({ type: 'skipped', step: 1 }));
    expect(h.markSeen).toHaveBeenCalledWith(ID);
    h.search = '';
    act(() => result.current.tour!.onClose());
    expect(result.current.tour).toBeNull();
  });

  it('a replay asked for but left unopened ends when they leave Home', async () => {
    h.search = 'tour=replay';
    const seen = member({ seenItems: [ID] });
    const props = { member: seen, access: open, previewing: false };
    const { result, rerender } = host({ ...props, pathname: '/home' });
    h.search = '';
    // Gone before it opened (the settle beat).
    rerender({ ...props, pathname: '/bookings' });
    rerender({ ...props, pathname: '/home' });
    await settle();
    expect(result.current.tour).toBeNull();
  });
});
