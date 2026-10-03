import type { Viewer } from '@/types/mentor';
import { accountItems, countsFor, isMenteeSide } from './useAppShell';
import { creditsView } from '@/lib/utils/credits';

vi.mock('@/lib/api/data/auth', () => ({ useSignOut: () => vi.fn() }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => ({ kind: 'guest' }) }));

type Member = Extract<Viewer, { kind: 'member' }>;
const member = (over: Partial<Member> = {}): Member => ({
  kind: 'member',
  id: 'u1',
  firstName: 'Gbenga',
  initial: 'G',
  isMentee: false,
  isApprovedMentor: true,
  isMentor: true,
  completedSessions: 0,
  credits: null,
  ...over,
});

describe('accountItems (AppShell.dc.html account menu)', () => {
  // A failed assertion must not leak the stubbed env into later tests.
  afterEach(() => vi.unstubAllEnvs());

  it('a mentor: "View profile" first, linking to their own profile, then Logout', () => {
    const items = accountItems(member(), vi.fn());
    expect(items.map((i) => i.label)).toEqual(['View profile', 'Logout']);
    expect(items[0]).toMatchObject({ icon: 'account_box', href: '/mentors/u1' });
  });

  it('a mentee: no "View profile" (no mentee profile page yet, #50)', () => {
    const items = accountItems(
      member({ isMentor: false, isApprovedMentor: false, isMentee: true }),
      vi.fn(),
    );
    expect(items.map((i) => i.label)).not.toContain('View profile');
    expect(items.at(-1)!.label).toBe('Logout');
  });

  it('Logout signs out', () => {
    const signOut = vi.fn();
    const logout = accountItems(member(), signOut).at(-1)!;
    if ('onSelect' in logout && logout.onSelect) logout.onSelect();
    expect(signOut).toHaveBeenCalled();
  });

  it('"Find my mentor matches" is for mentees only: never a mentor, pending included (product, 2026-09-30)', async () => {
    vi.stubEnv('NEXT_PUBLIC_MATCH_CALL_URL', 'https://cal.example/match');
    vi.resetModules();
    const { accountItems: fresh } = await import('./useAppShell');
    const labels = (m: Member) => fresh(m, vi.fn()).map((i) => i.label);
    expect(labels(member({ isApprovedMentor: false }))).toEqual(['View profile', 'Logout']);
    expect(labels(member())).toEqual(['View profile', 'Logout']);
    expect(labels(member({ isMentor: false, isApprovedMentor: false, isMentee: true }))).toEqual([
      'Find my mentor matches',
      'Logout',
    ]);
    // Signed up, no goal yet and no mentor profile: still a would-be mentee.
    expect(labels(member({ isMentor: false, isApprovedMentor: false, isMentee: false }))).toContain(
      'Find my mentor matches',
    );
  });

  it('no member (loading, or not signed in as a member): Logout only', () => {
    expect(accountItems(null, vi.fn()).map((i) => i.label)).toEqual(['Logout']);
  });
});

describe('countsFor (the Bookings badge)', () => {
  it('words the count by role, singular and plural', () => {
    expect(countsFor(member({ awaitingResponse: 1 }))).toEqual({
      Bookings: { count: 1, label: '1 request awaiting your response' },
    });
    expect(countsFor(member({ isMentor: false, isMentee: true, awaitingResponse: 3 }))).toEqual({
      Bookings: { count: 3, label: '3 requests awaiting the mentor' },
    });
  });

  it('no badge at 0, with no count, or before /me answers', () => {
    expect(countsFor(member({ awaitingResponse: 0 }))).toEqual({});
    expect(countsFor(member())).toEqual({});
    expect(countsFor(null)).toEqual({});
  });
});

describe('isMenteeSide (who gets "Find my mentor matches", menu and Explore)', () => {
  it.each([
    ['a mentee', { isMentor: false, isApprovedMentor: false, isMentee: true }, true],
    [
      'a new member, no goal and no mentor profile',
      { isMentor: false, isApprovedMentor: false, isMentee: false },
      true,
    ],
    ['a pending mentor', { isMentor: true, isApprovedMentor: false, isMentee: false }, false],
    ['an approved mentor', { isMentor: true, isApprovedMentor: true, isMentee: false }, false],
    [
      'a mentor who also has a goal',
      { isMentor: true, isApprovedMentor: false, isMentee: true },
      false,
    ],
  ] as const)('%s → %s', (_who, flags, yes) => {
    expect(isMenteeSide(member(flags))).toBe(yes);
  });

  it('no member yet: no', () => {
    expect(isMenteeSide(null)).toBe(false);
  });
});

describe('credits in the shell: mentees only', () => {
  const c = {
    balance: 4,
    state: 'on_track' as const,
    nextResetAt: '2026-11-01T00:00:00Z',
    monthly: { balance: 3, ceiling: 3, expiresAt: '2026-11-01T00:00:00Z', unlocked: true },
    bonus: { balance: 1, groups: [{ count: 1, expiresAt: null }] },
  };
  it('a mentee (or a new member) with credits gets them; a mentor never does', () => {
    const mentee = member({ isMentor: false, isApprovedMentor: false, isMentee: true, credits: c });
    expect(isMenteeSide(mentee) ? creditsView(mentee.credits) : null).toEqual({
      left: 4,
      monthlyLeft: 3,
      monthlyTotal: 3,
      bonus: [{ count: 1, expires: false, expiresOn: null }],
      showMonthly: true,
      monthlyLapses: true,
      resetsOn: 'Nov 1',
    });
    const mentor = member({ credits: c });
    expect(isMenteeSide(mentor)).toBe(false);
  });
});
