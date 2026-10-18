import type { Viewer } from '@/types/mentor';

type Member = Extract<Viewer, { kind: 'member' }>;

const member = (over: Partial<Member> = {}): Member => ({
  kind: 'member',
  id: 'u1',
  firstName: 'Ada',
  initial: 'A',
  isMentee: true,
  isApprovedMentor: false,
  isMentor: false,
  completedSessions: 0,
  credits: null,
  ...over,
});
const mentor = (over: Partial<Member> = {}) =>
  member({ isMentee: false, isMentor: true, isApprovedMentor: true, ...over });

/** The flags are read once, at import: load the module per case. */
async function load(onboarding = true, mentorOnboarding = true) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_ONBOARDING_ENABLED', onboarding ? 'true' : '');
  vi.stubEnv('NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED', mentorOnboarding ? 'true' : '');
  return await import('./access');
}

afterEach(() => vi.unstubAllEnvs());

const locked = (a: { locked: ReadonlySet<string> }) => [...a.locked].sort();

describe('accessFor: who is locked (owner, 2026-10-18)', () => {
  it('menteeSetup: an unfinished mentee loses Bookings (and Messages); Home goes to onboarding', async () => {
    const { accessFor } = await load();
    const a = accessFor(member({ onboardingComplete: false }));
    expect(a.state).toBe('menteeSetup');
    expect(locked(a)).toEqual(['Bookings', 'Messages']);
    expect(a).toMatchObject({ homeHref: '/onboarding', setupPill: true });
    expect(a.copy).toMatchObject({
      why: 'locked until you finish setting up',
      body: 'Tell us what you need help with and your study plans. It’s 2 short steps, and your first session is free.',
      cta: 'Continue setup',
      href: '/onboarding',
    });
    expect(a.copy!.title('Bookings')).toBe('Finish setting up to use Bookings');
  });

  it('a finished mentee, and one /me says nothing about, get no locks', async () => {
    const { accessFor } = await load();
    for (const v of [member({ onboardingComplete: true }), member()]) {
      expect(accessFor(v)).toMatchObject({ state: 'none', homeHref: null, setupPill: false });
      expect(accessFor(v).locked.size).toBe(0);
    }
  });

  it('mentorReview: a submitted, pending application loses Bookings (and Messages)', async () => {
    const { accessFor } = await load();
    const a = accessFor(mentor({ isApprovedMentor: false, mentorStage: 'pending' }));
    expect(a.state).toBe('mentorReview');
    expect(locked(a)).toEqual(['Bookings', 'Messages']);
    expect(a).toMatchObject({ homeHref: '/mentor-application', setupPill: false });
    expect(a.copy).toMatchObject({
      why: 'opens once you’re approved',
      body: 'We’re reviewing your application. You can set up your profile, sessions and hours while you wait.',
      cta: 'See application status',
      href: '/mentor-application',
    });
    expect(a.copy!.title('Bookings')).toBe('Bookings opens once you’re approved');
  });

  it('mentorNotApproved: a declined mentor loses Sessions, Bookings, Calendar, Integration (and Messages)', async () => {
    const { accessFor } = await load();
    const a = accessFor(mentor({ isApprovedMentor: false, mentorStage: 'declined' }));
    expect(a.state).toBe('mentorNotApproved');
    expect(locked(a)).toEqual(['Bookings', 'Calendar', 'Integration', 'Messages', 'Sessions']);
    expect(a.homeHref).toBe('/mentor-application');
    expect(a.copy).toMatchObject({
      why: 'not available',
      body: 'Your mentor application wasn’t approved. See the review note, contact us to apply again, or use EduFurther as a mentee.',
      cta: 'See your result',
      href: '/mentor-application',
    });
    expect(a.copy!.title('Sessions')).toBe('Sessions isn’t available');
  });

  it('Explore, Settings and Home never lock', async () => {
    const { accessFor } = await load();
    for (const v of [
      member({ onboardingComplete: false }),
      mentor({ mentorStage: 'pending' }),
      mentor({ mentorStage: 'declined' }),
    ]) {
      const a = accessFor(v);
      for (const k of ['Explore', 'Settings', 'Home'] as const) expect(a.locked.has(k)).toBe(false);
    }
  });

  it('an approved mentor has no locks; Home opens the application until the approved screen is seen', async () => {
    const { accessFor } = await load();
    expect(accessFor(mentor({ mentorStage: 'approved', mentorApprovedSeen: true }))).toMatchObject({
      state: 'none',
      homeHref: null,
    });
    // Unknown (an older backend) is seen: never the "already approved" toast.
    expect(accessFor(mentor({ mentorStage: 'approved' })).homeHref).toBeNull();
    const unseen = accessFor(mentor({ mentorStage: 'approved', mentorApprovedSeen: false }));
    expect(unseen).toMatchObject({ state: 'none', homeHref: '/mentor-application' });
    expect(unseen.locked.size).toBe(0);
  });

  it('menteeByChoice (declined, chose mentee) follows the mentee rules, never the declined lock', async () => {
    const { accessFor } = await load();
    // toViewer maps them to isMentor false, mentorStage none.
    const finished = member({ mentorStage: 'none', onboardingComplete: true });
    expect(accessFor(finished).state).toBe('none');
    const unfinished = member({ mentorStage: 'none', onboardingComplete: false });
    expect(accessFor(unfinished).state).toBe('menteeSetup');
  });

  it('a mentor who never submitted is in mentor onboarding: no lock', async () => {
    const { accessFor } = await load();
    expect(accessFor(mentor({ mentorStage: 'unsubmitted' })).state).toBe('none');
  });

  it('a mentor whose mentee onboarding is unfinished is still judged as a mentor', async () => {
    const { accessFor } = await load();
    const a = accessFor(mentor({ mentorStage: 'approved', onboardingComplete: false }));
    expect(a.state).toBe('none');
  });

  it.each([
    ['loading (session unknown)', { kind: 'loading', signedIn: null }],
    ['loading (/me on its way)', { kind: 'loading', signedIn: true }],
    ['a guest', { kind: 'guest' }],
    ['unlinked', { kind: 'unlinked' }],
    ['account exists', { kind: 'accountExists' }],
  ] as [string, Viewer][])('%s: no locks, Home unchanged', async (_who, v) => {
    const { accessFor } = await load();
    expect(accessFor(v)).toMatchObject({
      state: 'none',
      homeHref: null,
      setupPill: false,
      copy: null,
    });
    expect(accessFor(v).locked.size).toBe(0);
  });
});

describe('accessFor: a state whose page is switched off applies nothing (no 404s)', () => {
  it('onboarding off: no mentee lock and Home stays /home', async () => {
    const { accessFor } = await load(false, true);
    expect(accessFor(member({ onboardingComplete: false }))).toMatchObject({
      state: 'none',
      homeHref: null,
      setupPill: false,
    });
  });

  it('mentor onboarding off: no mentor lock and Home stays /dashboard', async () => {
    const { accessFor } = await load(true, false);
    for (const stage of ['pending', 'declined'] as const)
      expect(accessFor(mentor({ mentorStage: stage }))).toMatchObject({
        state: 'none',
        homeHref: null,
      });
    expect(
      accessFor(mentor({ mentorStage: 'approved', mentorApprovedSeen: false })).homeHref,
    ).toBeNull();
  });
});

describe('memberHome: one rule for /, sign-in and the nav', () => {
  it('sends each member to their own home', async () => {
    const { memberHome } = await load();
    expect(memberHome({ isMentor: false })).toBe('/home');
    expect(memberHome({ isMentor: false, onboardingComplete: null })).toBe('/home');
    expect(memberHome({ isMentor: false, onboardingComplete: false })).toBe('/onboarding');
    expect(memberHome({ isMentor: true })).toBe('/dashboard');
    expect(memberHome({ isMentor: true, mentorStage: 'pending' })).toBe('/mentor-application');
    expect(memberHome({ isMentor: true, mentorStage: 'declined' })).toBe('/mentor-application');
    expect(memberHome({ isMentor: true, mentorStage: 'approved', mentorApprovedSeen: false })).toBe(
      '/mentor-application',
    );
    expect(memberHome({ isMentor: true, mentorStage: 'approved', mentorApprovedSeen: true })).toBe(
      '/dashboard',
    );
  });

  it('with the flags off, nobody is sent to a page that 404s', async () => {
    const { memberHome } = await load(false, false);
    expect(memberHome({ isMentor: false, onboardingComplete: false })).toBe('/home');
    expect(memberHome({ isMentor: true, mentorStage: 'declined' })).toBe('/dashboard');
  });
});

describe('mentorStageOf (toMentorApplication’s rule)', () => {
  it('reads the stage from approval_status and submitted_at', async () => {
    const { mentorStageOf } = await load();
    expect(mentorStageOf(null)).toBe('none');
    expect(mentorStageOf({ approval_status: 'approved' })).toBe('approved');
    expect(mentorStageOf({ approval_status: 'declined' })).toBe('declined');
    expect(mentorStageOf({ approval_status: 'pending', submitted_at: null })).toBe('unsubmitted');
    expect(mentorStageOf({ approval_status: 'pending', submitted_at: '2026-10-01' })).toBe(
      'pending',
    );
    // An older backend without submitted_at: a profile is an application.
    expect(mentorStageOf({ approval_status: 'pending' })).toBe('pending');
  });
});

describe('setupCredits', () => {
  it('holds nothing: every balance 0, no bonus groups, the rest kept', async () => {
    const { setupCredits } = await load();
    const c = {
      balance: 4,
      nextResetAt: '2026-11-01T00:00:00Z',
      monthly: { balance: 3, ceiling: 3, expiresAt: null, unlocked: true },
      bonus: { balance: 1, groups: [{ count: 1, expiresAt: null }] },
    };
    expect(setupCredits(c)).toEqual({
      balance: 0,
      nextResetAt: '2026-11-01T00:00:00Z',
      monthly: { balance: 0, ceiling: 3, expiresAt: null, unlocked: true },
      bonus: { balance: 0, groups: [] },
    });
  });
});
