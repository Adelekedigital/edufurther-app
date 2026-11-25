import { act, renderHook } from '@testing-library/react';
import { EMPTY_STATS, type MenteeStats } from '@/lib/api/data/menteeHome';
import { ladderProgress, useCreditLadder } from './useCreditLadder';

const h = vi.hoisted(() => ({
  statsActive: [] as boolean[],
  refsActive: [] as boolean[],
  stats: null as MenteeStats | null,
  refs: null as { qualifiedAt: string | null }[] | null,
}));
vi.mock('@/lib/api/data/menteeHome', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/menteeHome')>()),
  useMenteeStats: (_id: string | null, active: boolean) => {
    h.statsActive.push(active);
    return { data: active ? h.stats : null };
  },
}));
vi.mock('@/lib/api/data/invite', () => ({
  useReferrals: (_id: string | null, active: boolean) => {
    h.refsActive.push(active);
    const data = active ? h.refs : null;
    return { data, friendJoined: !!data?.some((r) => r.qualifiedAt) };
  },
}));

const stats = (sessionsAttended: number | null): MenteeStats => ({
  ...EMPTY_STATS,
  sessionsHeld: 5,
  sessionsAttended,
});

beforeEach(() => {
  h.statsActive = [];
  h.refsActive = [];
  h.stats = null;
  h.refs = null;
});

describe('ladderProgress (decision 370)', () => {
  it('attended is sessions_attended >= 1, never sessions_held', () => {
    const none = { data: [], friendJoined: false };
    expect(ladderProgress(stats(0), none).attended).toBe(false);
    expect(ladderProgress(stats(1), none).attended).toBe(true);
    // Held 5 but attended not sent: unknown, not ticked.
    expect(ladderProgress(stats(null), none).attended).toBeNull();
  });
  it('a friend is any referral with qualified_at; unknown until the list is read', () => {
    expect(ladderProgress(null, { data: [{}], friendJoined: true }).friendJoined).toBe(true);
    expect(ladderProgress(null, { data: [], friendJoined: false }).friendJoined).toBe(false);
    expect(ladderProgress(null, { data: null, friendJoined: false })).toEqual({
      attended: null,
      friendJoined: null,
    });
  });
});

describe('useCreditLadder', () => {
  it('reads nothing until the card opens, then both', () => {
    h.stats = stats(1);
    h.refs = [{ qualifiedAt: null }];
    const { result } = renderHook(() => useCreditLadder('u1'));
    expect(h.statsActive.every((a) => !a)).toBe(true);
    expect(h.refsActive.every((a) => !a)).toBe(true);
    expect(result.current.progress).toEqual({ attended: null, friendJoined: null });
    act(() => result.current.onOpen());
    expect(h.statsActive.at(-1)).toBe(true);
    expect(h.refsActive.at(-1)).toBe(true);
    expect(result.current.progress).toEqual({ attended: true, friendJoined: false });
  });
  it('never for a viewer who is not a mentee (no user id)', () => {
    const { result } = renderHook(() => useCreditLadder(null));
    act(() => result.current.onOpen());
    expect(h.statsActive.some(Boolean)).toBe(false);
    expect(result.current.progress).toEqual({ attended: null, friendJoined: null });
  });
});
