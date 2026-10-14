import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MenteeStats } from '@/lib/api/data/menteeHome';
import type { Booking, BookingParty } from '@/types/booking';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import { MenteeHomeScreen } from './MenteeHomeScreen';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

let viewer: Viewer;
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => ({
    viewer,
    member: viewer.kind === 'member' ? viewer : null,
    chrome: viewer.kind === 'guest' ? 'guest' : 'member',
    account: undefined,
    nav: viewer.kind === 'member' && viewer.isMentor ? 'mentor' : 'mentee',
  }),
}));

let stats: Remote<MenteeStats>;
vi.mock('@/lib/api/data/menteeHome', () => ({
  useMenteeStats: () => stats,
}));

let upcoming: Remote<Booking[]>;
vi.mock('@/lib/api/data/bookings', () => ({
  useUpcomingBookings: () => upcoming,
}));

const remote =<T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const party = (name = 'Olajuwon Samuel'): BookingParty => ({
  id: 'p1',
  name,
  firstName: name.split(' ')[0]!,
  initials: 'OS',
  avatarUrl: null,
  avatarFocus: null,
  deleted: false,
  timeZone: 'Africa/Lagos',
  cover: 'sand',
  degree: null,
  institution: null,
  joinedAt: null,
  inRoomAt: null,
  attendance: 'pending',
});

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  status: 'confirmed',
  side: 'mentee',
  other: party(),
  myAttendance: 'pending',
  myJoinedAt: null,
  startsAt: inHours(120),
  endsAt: inHours(121),
  durationMin: 60,
  title: 'Scholarship strategy call',
  note: null,
  answersPreview: null,
  suggestion: null,
  sessionTypeId: 'st1',
  createdAt: inHours(-240),
  respondBy: null,
  joinOpensAt: inHours(119.9),
  joinClosesAt: inHours(120.25),
  doorClosesAt: null,
  refundUntil: null,
  menteeAttendanceRate: null,
  menteeAttendanceSessions: 0,
  ...over,
});

const STATS: MenteeStats = {
  sessionsHeld: 12,
  mentorsMet: 8,
  hoursOfGuidance: 9,
  missedSessions: 0,
  missedWindowDays: 90,
  windowDays: 30,
  current: { sessions: 2, hours: 1.5 },
  previous: { sessions: 1, hours: 0.75 },
};

const MEMBER: Extract<Viewer, { kind: 'member' }> = {
  kind: 'member',
  id: 'me',
  firstName: 'Damilola',
  initial: 'D',
  isMentee: true,
  isApprovedMentor: false,
  isMentor: false,
  completedSessions: 12,
  credits: null,
  timeZone: 'Africa/Lagos',
  bookingCounts: { pending: 0, upcoming: 1 },
};
/** A mentee with no sessions, no bookings — the new-user state. */
const NEW_MEMBER: Extract<Viewer, { kind: 'member' }> = {
  ...MEMBER,
  completedSessions: 0,
  bookingCounts: { pending: 0, upcoming: 0 },
};

const err = {} as unknown as AppError;

beforeEach(() => {
  replace.mockClear();
  viewer = MEMBER;
  stats = remote(STATS);
  upcoming = remote([booking()]);
});

describe('MenteeHomeScreen', () => {
  it('a returning mentee sees the greeting, the progress figures and the next session', () => {
    render(<MenteeHomeScreen />);
    expect(screen.getByRole('heading', { name: /Welcome back, Damilola/ })).toBeInTheDocument();
    expect(screen.getByText('Sessions held')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2 in the last 30 days')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Next session' })).toBeInTheDocument();
    expect(screen.getByText('Scholarship strategy call')).toBeInTheDocument();
    // Far off (120h): the action is View details, not Join.
    expect(screen.getByRole('link', { name: 'View details' })).toBeInTheDocument();
  });

  it('a new mentee gets the first-booking invitation and encouraging zeros', () => {
    viewer = NEW_MEMBER;
    render(<MenteeHomeScreen />);
    expect(screen.getByRole('heading', { name: 'Book your first session' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find a mentor' })).toBeInTheDocument();
    expect(screen.getByText('Your first one counts here')).toBeInTheDocument();
    expect(screen.getByText('Let’s find the right mentor for your goal.')).toBeInTheDocument();
    // No "No data yet" and no real figures in the new state.
    expect(screen.queryByText('12')).not.toBeInTheDocument();
  });

  it('treats a null booking count as unknown, not zero — shows the real session, not the hero', () => {
    // completedSessions 0 but upcoming count is null (unknown). It must not be
    // read as "no activity": the real next session shows, not the new-mentee hero.
    viewer = { ...MEMBER, completedSessions: 0, bookingCounts: { pending: 0, upcoming: null } };
    render(<MenteeHomeScreen />);
    expect(screen.getByRole('heading', { name: 'Next session' })).toBeInTheDocument();
    expect(screen.queryByText('Book your first session')).not.toBeInTheDocument();
  });

  it('reads no-upcoming from the list, not the count — an empty list wins a stale count', () => {
    // MEMBER's count says 1 upcoming, but the list is empty: the subline and the
    // card both follow the list, so they never disagree.
    viewer = MEMBER;
    upcoming = remote([]);
    render(<MenteeHomeScreen />);
    expect(
      screen.getByText('No session booked right now. Pick up where you left off.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Nothing booked yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book a session' })).toBeInTheDocument();
  });

  it('a pending request reads as "waiting", not "nothing booked" (no duplicate invite)', () => {
    // completedSessions 0 with a pending request (count) but no confirmed
    // upcoming: useUpcomingBookings returns only confirmed rows, so the list is
    // empty. The screen must surface the outstanding request, not invite a rebook.
    viewer = { ...MEMBER, completedSessions: 0, bookingCounts: { pending: 1, upcoming: 0 } };
    upcoming = remote([]);
    render(<MenteeHomeScreen />);
    expect(screen.getByText('Waiting on your mentor')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View your request' })).toBeInTheDocument();
    expect(
      screen.getByText('Your request is with your mentor — we’ll let you know.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Nothing booked yet')).not.toBeInTheDocument();
  });

  it('advances the next-session clock so "Join" opens without a reload (minute tick)', () => {
    vi.useFakeTimers();
    try {
      const base = Date.now();
      const mins = (m: number) => new Date(base + m * 60_000).toISOString();
      // 61 min out: just outside the within-the-hour window, join not yet open.
      viewer = MEMBER;
      upcoming = remote([
        booking({ startsAt: mins(61), endsAt: mins(106), joinOpensAt: mins(51), joinClosesAt: mins(76) }),
      ]);
      render(<MenteeHomeScreen />);
      expect(screen.getByRole('link', { name: 'View details' })).toBeInTheDocument();
      // Two minute-ticks later it's 59 min out — the card flips to Join on its own.
      act(() => {
        vi.advanceTimersByTime(120_000);
      });
      expect(screen.getByRole('link', { name: 'Join session' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'View details' })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('sends a signed-in member with no goal (not a mentee) to Explore, not the mentee page', async () => {
    viewer = { ...MEMBER, isMentee: false, isMentor: false };
    render(<MenteeHomeScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/explore'));
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
  });

  it('a failed next-session load offers a retry, not a blank space', async () => {
    upcoming = remote<Booking[]>(null, { error: err });
    render(<MenteeHomeScreen />);
    expect(screen.getByText(/couldn’t load your next session/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(upcoming.retry).toHaveBeenCalled();
  });

  it('a failed progress load offers a retry in place of the figures', async () => {
    stats = remote<MenteeStats>(null, { error: err });
    render(<MenteeHomeScreen />);
    expect(screen.getByText(/couldn’t load your progress/)).toBeInTheDocument();
    expect(screen.queryByText('Sessions held')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(stats.retry).toHaveBeenCalled();
  });

  it('shows no content while /me is still loading', () => {
    viewer = { kind: 'loading', signedIn: true };
    render(<MenteeHomeScreen />);
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
  });

  it('sends a mentor who lands here to their own dashboard', async () => {
    viewer = { ...MEMBER, isMentor: true, isApprovedMentor: true, isMentee: false };
    render(<MenteeHomeScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('sends a guest who lands here to Explore', async () => {
    viewer = { kind: 'guest' };
    render(<MenteeHomeScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/explore'));
  });
});
