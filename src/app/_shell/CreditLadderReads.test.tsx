import { act, render, renderHook } from '@testing-library/react';
import { EMPTY_STATS, type MenteeStats } from '@/lib/api/data/menteeHome';
import { CreditLadderReads, ladderProgress } from './CreditLadderReads';
import { useCreditLadder } from './useCreditLadder';

const h = vi.hoisted(() => ({
  stats: null as MenteeStats | null,
  refs: null as { qualifiedAt: string | null }[] | null,
}));
vi.mock('@/lib/api/data/menteeHome', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/menteeHome')>()),
  useMenteeStats: () => ({ data: h.stats }),
}));
vi.mock('@/lib/api/data/invite', () => ({
  useReferrals: () => ({
    data: h.refs,
    friendJoined: !!h.refs?.some((r) => r.qualifiedAt),
  }),
}));

const stats = (sessionsAttended: number | null): MenteeStats => ({
  ...EMPTY_STATS,
  sessionsHeld: 5,
  sessionsAttended,
});

beforeEach(() => {
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

describe('CreditLadderReads', () => {
  it('reports unknown while loading, then what the reads say', () => {
    const onProgress = vi.fn();
    const { rerender } = render(<CreditLadderReads userId="u1" onProgress={onProgress} />);
    expect(onProgress).toHaveBeenLastCalledWith({ attended: null, friendJoined: null });
    h.stats = stats(1);
    h.refs = [{ qualifiedAt: null }];
    rerender(<CreditLadderReads userId="u1" onProgress={onProgress} />);
    expect(onProgress).toHaveBeenLastCalledWith({ attended: true, friendJoined: false });
  });
});

describe('useCreditLadder', () => {
  it('nothing reads until the card opens', () => {
    const { result } = renderHook(() => useCreditLadder('u1'));
    expect(result.current.host).toBeNull();
    expect(result.current.progress).toEqual({ attended: null, friendJoined: null });
    act(() => result.current.onOpen());
    expect(result.current.host).not.toBeNull();
  });
  it('never for a viewer who is not a mentee (no user id)', () => {
    const { result } = renderHook(() => useCreditLadder(null));
    act(() => result.current.onOpen());
    expect(result.current.host).toBeNull();
  });
});
