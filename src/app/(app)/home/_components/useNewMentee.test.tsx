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
const pendingArgs = vi.fn();
vi.mock('@/lib/api/data/bookings', () => ({
  usePendingBookings: (...a: unknown[]) => {
    pendingArgs(...a);
    return pending;
  },
}));
let education: { entries: unknown[]; status: string; retry: () => void };
const educationArgs = vi.fn();
vi.mock('@/lib/api/data/profileEntries', () => ({
  useOwnEducation: (...a: unknown[]) => {
    educationArgs(...a);
    return education;
  },
}));
let profile: { profile: unknown; status: string; retry: () => void };
const profileArgs = vi.fn();
vi.mock('@/lib/api/data/settings', () => ({
  useMenteeProfile: (...a: unknown[]) => {
    profileArgs(...a);
    return profile;
  },
}));

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
  readProfile: false,
  goals: goals(),
  topics: [],
  upcoming: remote<Booking[]>([]),
  ...over,
});

beforeEach(() => {
  pending = remote<Booking[]>([]);
  education = { entries: [], status: 'ready', retry: vi.fn() };
  profile = { profile: { bio: '', bioDrafted: false }, status: 'ready', retry: vi.fn() };
  pendingArgs.mockClear();
  educationArgs.mockClear();
  profileArgs.mockClear();
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

  it('the full Home reads the four details only (no requests list)', () => {
    const { result } = renderHook(() => useNewMentee(args({ active: false, readProfile: true })));
    expect(pendingArgs).toHaveBeenLastCalledWith('me', false);
    expect(educationArgs).toHaveBeenLastCalledWith('me', true);
    expect(profileArgs).toHaveBeenLastCalledWith('me');
    expect(result.current.detailsStatus).toBe('ready');
    // Nothing saved: 0 of 4, not done.
    expect(result.current.profileDone).toBe(false);
  });

  it('neither view: no reads at all', () => {
    renderHook(() => useNewMentee(args({ active: false, readProfile: false })));
    expect(educationArgs).toHaveBeenLastCalledWith('me', false);
    expect(profileArgs).toHaveBeenLastCalledWith(null);
  });

  it('the details are loading, then error, before they say done or not', () => {
    education = { entries: [], status: 'loading', retry: vi.fn() };
    const { result, rerender } = renderHook(() => useNewMentee(args({ readProfile: true })));
    expect(result.current.detailsStatus).toBe('loading');
    profile = { profile: null, status: 'error', retry: vi.fn() };
    rerender();
    expect(result.current.detailsStatus).toBe('error');
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
