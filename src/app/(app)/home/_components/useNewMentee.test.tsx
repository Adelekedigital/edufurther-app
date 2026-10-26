import { renderHook } from '@testing-library/react';
import type { Booking } from '@/types/booking';
import type { Remote } from '@/types/mentor';
import { useNewMentee } from './useNewMentee';

const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

let pending: Remote<Booking[]>;
let history: { bookings: Booking[]; isLoading: boolean };
const historyArgs = vi.fn();
vi.mock('@/lib/api/data/bookings', () => ({
  usePendingBookings: () => pending,
  useBookingHistory: (...a: unknown[]) => {
    historyArgs(...a);
    return history;
  },
}));
let education: { entries: unknown[]; status: string; retry: () => void };
vi.mock('@/lib/api/data/profileEntries', () => ({ useOwnEducation: () => education }));
let profile: { profile: unknown; status: string; retry: () => void };
vi.mock('@/lib/api/data/settings', () => ({ useMenteeProfile: () => profile }));

const row = (id: string, name: string, startsAt: string, side: 'mentee' | 'mentor' = 'mentee') =>
  ({ id, side, startsAt, other: { name } }) as unknown as Booking;

const goals = (status: 'ready' | 'loading' | 'error' = 'ready') =>
  ({
    read: status === 'ready' ? { goal: null, originCode: null, currentCode: null } : null,
    status,
    retry: vi.fn(),
    retrying: false,
  }) as never;

const args = (over: Record<string, unknown> = {}) => ({
  userId: 'me',
  active: true,
  hasCompleted: false,
  goals: goals(),
  topics: [],
  upcoming: remote<Booking[]>([]),
  ...over,
});

beforeEach(() => {
  pending = remote<Booking[]>([]);
  history = { bookings: [], isLoading: false };
  education = { entries: [], status: 'ready', retry: vi.fn() };
  profile = { profile: { bio: '', bioDrafted: false }, status: 'ready', retry: vi.fn() };
  historyArgs.mockClear();
});

describe('useNewMentee', () => {
  it('the first booking is the earliest mentee-side row across requests and confirmed sessions', () => {
    pending = remote([row('p1', 'Tunde Bakare', '2026-11-02T10:00:00Z')]);
    const upcoming = remote([
      row('u0', 'Mentor Side', '2026-10-29T08:00:00Z', 'mentor'),
      row('u1', 'Mariam Alamata', '2026-10-30T17:00:00Z'),
    ]);
    const { result } = renderHook(() => useNewMentee(args({ upcoming })));
    expect(result.current.booked).toEqual({
      mentorFirst: 'Mariam',
      startsAt: '2026-10-30T17:00:00Z',
      confirmed: true,
    });
  });

  it('a first session done comes from /me; history only names it, and is read only then', () => {
    const { result, rerender } = renderHook((p: Record<string, unknown>) => useNewMentee(args(p)), {
      initialProps: {},
    });
    expect(result.current.firstDone).toBeNull();
    expect(historyArgs).toHaveBeenLastCalledWith('me', ['completed'], false);
    rerender({ hasCompleted: true });
    expect(result.current.firstDone).toEqual({ mentorFirst: null, startsAt: null });
    history = {
      bookings: [row('h1', 'Olajuwon Samuel', '2026-10-08T10:00:00Z')],
      isLoading: false,
    };
    rerender({ hasCompleted: true });
    expect(result.current.firstDone).toEqual({
      mentorFirst: 'Olajuwon',
      startsAt: '2026-10-08T10:00:00Z',
    });
  });

  it('loading until every read the stage needs has answered', () => {
    education = { entries: [], status: 'loading', retry: vi.fn() };
    const { result } = renderHook(() => useNewMentee(args()));
    expect(result.current.loading).toBe(true);
  });

  it('a failed read is an error, not "not done", and retry asks again for what failed', () => {
    profile = { profile: null, status: 'error', retry: vi.fn() };
    const { result } = renderHook(() => useNewMentee(args()));
    expect(result.current.error).toBe(true);
    expect(result.current.loading).toBe(false);
    result.current.retry();
    expect(profile.retry).toHaveBeenCalled();
    expect(education.retry).not.toHaveBeenCalled();
  });
});
