import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MenteeStats } from '@/lib/api/data/menteeHome';
import type { Booking, BookingParty } from '@/types/booking';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import type { MetMentor } from '@/lib/api/data/metMentors';
import { MenteeHomeScreen } from './MenteeHomeScreen';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

let viewer: Viewer;
vi.mock('@/app/_shell/useAppShell', () => ({
  MATCH_CALL_URL: 'https://cal.test',
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

let metMentors: Remote<MetMentor[]>;
vi.mock('@/lib/api/data/metMentors', () => ({
  useMetMentors: () => metMentors,
  toBookingMentor: (m: MetMentor) => m,
}));

// BookingLauncher pulls in the booking query hooks (need a QueryClient); the
// screen only needs to know a booking opened, so stub it to a marker.
vi.mock('@/app/_shell/BookingLauncher/BookingLauncher', () => ({
  BookingLauncher: ({ mentor, hideProfileLink }: { mentor: unknown; hideProfileLink?: boolean }) =>
    mentor ? (
      <div data-testid="booking-open" data-hide-profile={String(!!hideProfileLink)} />
    ) : null,
}));

const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
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
  inRoom: null,
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
  thisMonth: null,
};

const MEMBER: Extract<Viewer, { kind: 'member' }> = {
  kind: 'member',
  id: 'me',
  firstName: 'Damilola',
  initials: 'D',
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

const metMentor = (over: Partial<MetMentor> = {}): MetMentor => ({
  id: 'm1',
  slug: 'mariam-alamata',
  name: 'Mariam Alamata',
  firstName: 'Mariam',
  initials: 'MA',
  cover: 'sky',
  avatarUrl: null,
  avatarFocus: null,
  degree: 'MSc, Public Health',
  institution: 'University of Edinburgh',
  sessionCount: 2,
  lastSessionAt: inHours(-200),
  bookability: 'open',
  ...over,
});

const err = {} as unknown as AppError;

beforeEach(() => {
  replace.mockClear();
  viewer = MEMBER;
  stats = remote(STATS);
  upcoming = remote([booking()]);
  metMentors = remote([]);
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
    // The Next-session card offers Tips (a static modal) beside All bookings.
    expect(screen.getByRole('button', { name: 'Tips' })).toBeInTheDocument();
  });

  it('a new mentee gets the first-booking invitation and no progress figures', () => {
    viewer = NEW_MEMBER;
    render(<MenteeHomeScreen />);
    expect(screen.getByRole('heading', { name: 'Book your first session' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find a mentor' })).toBeInTheDocument();
    expect(screen.getByText('Let’s find the right mentor for your goal.')).toBeInTheDocument();
    // The new view has no KPIs (design newHome nextStep: kpiTop false).
    expect(screen.queryByRole('region', { name: 'Your progress' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sessions held')).not.toBeInTheDocument();
  });

  it('every tile has its hint, and a missed session links to Bookings History filtered to Missed', () => {
    stats = remote<MenteeStats>({ ...STATS, missedSessions: 1 });
    render(<MenteeHomeScreen />);
    expect(
      screen.getByRole('button', { name: 'Sessions you and your mentor both joined' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Missed · 90 days')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View missed' })).toHaveAttribute(
      'href',
      '/bookings?tab=history&filter=missed',
    );
  });

  it('a failed refetch keeps the default subline while the card shows its error', () => {
    const at = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
    upcoming = remote<Booking[]>(
      [booking({ startsAt: at(20), endsAt: at(65), joinOpensAt: at(10), joinClosesAt: at(35) })],
      { error: err },
    );
    render(<MenteeHomeScreen />);
    expect(screen.getByText(/couldn’t load your next session/)).toBeInTheDocument();
    expect(screen.queryByText('Your session starts soon.')).not.toBeInTheDocument();
    expect(screen.getByText('Here’s what’s next on your journey.')).toBeInTheDocument();
  });

  it('"Your session starts soon." once the next session is within the hour', () => {
    const at = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
    upcoming = remote([
      booking({ startsAt: at(20), endsAt: at(65), joinOpensAt: at(10), joinClosesAt: at(35) }),
    ]);
    render(<MenteeHomeScreen />);
    expect(screen.getByText('Your session starts soon.')).toBeInTheDocument();
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

  it('the idle card shows free sessions left, pluralised, and drops the line at 0', () => {
    const monthly = (balance: number) =>
      ({
        monthly: { balance, ceiling: 3, expiresAt: null, unlocked: true },
      }) as unknown as (typeof MEMBER)['credits'];
    upcoming = remote([]);
    viewer = { ...MEMBER, credits: monthly(2) };
    const { rerender } = render(<MenteeHomeScreen />);
    expect(screen.getByText(/2 free sessions left this month/)).toBeInTheDocument();
    viewer = { ...MEMBER, credits: monthly(1) };
    rerender(<MenteeHomeScreen />);
    expect(screen.getByText(/1 free session left this month/)).toBeInTheDocument();
    viewer = { ...MEMBER, credits: monthly(0) };
    rerender(<MenteeHomeScreen />);
    expect(screen.getByText('Nothing booked yet')).toBeInTheDocument();
    expect(screen.queryByText(/free session/)).not.toBeInTheDocument();
  });

  it('the Next-session "Tips" link opens the tips modal', async () => {
    render(<MenteeHomeScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Tips' }));
    expect(screen.getByText('Tips for great sessions')).toBeInTheDocument();
    expect(screen.getByText('Take notes')).toBeInTheDocument();
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
    // Not the idle "Pick up where you left off": something is on its way.
    expect(screen.getByText('Here’s what’s next on your journey.')).toBeInTheDocument();
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
        booking({
          startsAt: mins(61),
          endsAt: mins(106),
          joinOpensAt: mins(51),
          joinClosesAt: mins(76),
        }),
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

  it('lists Book-again mentors, and "View mentors" opens the mentors you have met', async () => {
    metMentors = remote([metMentor()]);
    render(<MenteeHomeScreen />);
    expect(screen.getByRole('heading', { name: 'Your mentors' })).toBeInTheDocument();
    expect(screen.getByText('Mariam Alamata')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View mentors' }));
    expect(screen.getByRole('dialog', { name: 'Your mentors' })).toBeInTheDocument();
    // The full-screen list takes the help pill away while it's open.
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('opening "Book again" launches the booking flow', async () => {
    metMentors = remote([metMentor()]);
    render(<MenteeHomeScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Book again/ }));
    expect(screen.getByTestId('booking-open')).toBeInTheDocument();
    // "View profile" isn't hidden: a met mentor is reachable by id, slug or not.
    expect(screen.getByTestId('booking-open')).toHaveAttribute('data-hide-profile', 'false');
  });

  it('shows the help pill to new mentees and early ones (≤ 2 sessions), not experienced', () => {
    // Experienced (12 sessions): no "which mentor?" help pill.
    viewer = { ...MEMBER, completedSessions: 12 };
    const { unmount } = render(<MenteeHomeScreen />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    unmount();
    // A brand-new mentee gets it too (design: the new view shows the float).
    viewer = NEW_MEMBER;
    const next = render(<MenteeHomeScreen />);
    expect(
      screen.getByRole('complementary', { name: 'Not sure where to start?' }),
    ).toBeInTheDocument();
    next.unmount();
    // Early (2 sessions, has a booking so not new): the pill shows.
    viewer = { ...MEMBER, completedSessions: 2 };
    render(<MenteeHomeScreen />);
    expect(
      screen.getByRole('complementary', { name: 'Not sure where to start?' }),
    ).toBeInTheDocument();
  });

  it('keeps a signed-in member with no goal on the home — mentee-side, not redirected', () => {
    viewer = { ...MEMBER, isMentee: false, isMentor: false };
    render(<MenteeHomeScreen />);
    // No goal yet, but a non-mentor member is mentee-side: they stay and see
    // their home (product, 2026-10-15), not bounced to Explore.
    expect(screen.getByRole('heading', { name: /Welcome back, Damilola/ })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('a no-goal member with no activity still gets the first-booking invitation', () => {
    viewer = { ...NEW_MEMBER, isMentee: false, isMentor: false };
    render(<MenteeHomeScreen />);
    expect(screen.getByRole('heading', { name: 'Book your first session' })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
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

  it('greets an account made this week, with no session held, with "Welcome"', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    viewer = { ...NEW_MEMBER, createdAt: yesterday };
    render(<MenteeHomeScreen />);
    expect(screen.getByRole('heading', { name: 'Welcome, Damilola' })).toBeInTheDocument();
  });

  it('shows no content while /me is still loading', () => {
    viewer = { kind: 'loading', signedIn: true };
    render(<MenteeHomeScreen />);
    expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();
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

  it('shows the help pill to an early mentee, with nothing stepping in front of it (round 4, #14)', () => {
    // An unfinished mentee never reaches Home (the setup lock sends them to
    // /onboarding); the nudge that used to sit under the greeting is retired.
    viewer = { ...MEMBER, completedSessions: 2, onboardingComplete: false };
    render(<MenteeHomeScreen />);
    expect(screen.queryByRole('region', { name: /setting up|study plans|help with/i })).toBeNull();
    expect(
      screen.getByRole('complementary', { name: 'Not sure where to start?' }),
    ).toBeInTheDocument();
  });
});
