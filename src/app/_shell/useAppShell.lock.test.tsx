import { renderHook } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_ONBOARDING_ENABLED = 'true';
  process.env.NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED = 'true';
});
let viewer: Viewer = { kind: 'guest' };
vi.mock('@/lib/api/data/auth', () => ({ useSignOut: () => vi.fn() }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => viewer }));
const { useAppShell } = await import('./useAppShell');

type Member = Extract<Viewer, { kind: 'member' }>;
const mentee = (over: Partial<Member>): Member => ({
  kind: 'member',
  id: 'u1',
  firstName: 'Ada',
  initials: 'A',
  isMentee: true,
  isApprovedMentor: false,
  isMentor: false,
  completedSessions: 0,
  credits: {
    balance: 4,
    state: 'on_track',
    nextResetAt: '2026-11-01T00:00:00Z',
    monthly: { balance: 3, ceiling: 3, expiresAt: '2026-11-01T00:00:00Z', unlocked: true },
    bonus: { balance: 1, groups: [{ count: 1, expiresAt: null }] },
  },
  ...over,
});

describe('useAppShell: the setup lock', () => {
  it('menteeSetup: the shell reads 0 credits (the starter credit is paid at completion)', () => {
    viewer = mentee({ onboardingComplete: false });
    const { result } = renderHook(() => useAppShell());
    expect(result.current.access.state).toBe('menteeSetup');
    expect(result.current.account?.credits).toMatchObject({ left: 0, monthlyLeft: 0, bonus: [] });
  });

  it('a finished mentee keeps their credits', () => {
    viewer = mentee({ onboardingComplete: true });
    const { result } = renderHook(() => useAppShell());
    expect(result.current.access.state).toBe('none');
    expect(result.current.account?.credits).toMatchObject({ left: 4, monthlyLeft: 3 });
  });

  it('a mentor sign-up in setup: the mentor setup lock and no mentee credits', () => {
    viewer = mentee({ signedUpAsMentor: true, onboardingComplete: false });
    const { result } = renderHook(() => useAppShell());
    expect(result.current.access.state).toBe('mentorSetup');
    expect(result.current.account?.credits).toBeUndefined();
  });

  it('a mentor sign-up is not offered the team call (it helps people find a mentor)', async () => {
    const { isMenteeSide } = await import('./useAppShell');
    expect(isMenteeSide(mentee({ signedUpAsMentor: true, onboardingComplete: false }))).toBe(false);
    expect(isMenteeSide(mentee({}))).toBe(true);
  });

  it('a mentor who never submitted gets the mentor nav, locked', () => {
    viewer = mentee({ isMentee: false, isMentor: true, mentorStage: 'unsubmitted' });
    const { result } = renderHook(() => useAppShell());
    expect(result.current.nav).toBe('mentor');
    expect(result.current.access.state).toBe('mentorSetup');
    expect(result.current.account?.credits).toBeUndefined();
  });

  it('while /me loads: no locks, and the nav is unknown (no items, no counts)', () => {
    viewer = { kind: 'loading', signedIn: true };
    const { result } = renderHook(() => useAppShell());
    expect(result.current.access.state).toBe('none');
    expect(result.current.access.locked.size).toBe(0);
    expect(result.current.nav).toBe('unknown');
  });
});
