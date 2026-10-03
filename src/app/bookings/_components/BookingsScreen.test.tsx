import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BookingHistoryResult } from '@/lib/api/data/bookings';
import type { Booking, BookingParty } from '@/types/booking';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import { BookingsScreen } from './BookingsScreen';

let tab = 'upcoming';
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/bookings',
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(tab === 'upcoming' ? '' : `tab=${tab}`),
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

let upcoming: Remote<Booking[]>;
let pending: Remote<Booking[]>;
let history: BookingHistoryResult;
const join = vi.fn();
vi.mock('@/lib/api/data/bookings', () => ({
  useUpcomingBookings: () => upcoming,
  usePendingBookings: () => pending,
  useBookingHistory: () => history,
  useJoinSession: () => ({ mutate: join, isPending: false }),
}));

const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

const hist = (over: Partial<BookingHistoryResult> = {}): BookingHistoryResult => ({
  bookings: [],
  isLoading: false,
  error: null,
  retry: vi.fn(),
  hasMore: false,
  isLoadingMore: false,
  loadMoreError: null,
  loadMore: vi.fn(),
  ...over,
});

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();
const party = (name = 'Amara Okafor'): BookingParty => ({
  id: 'p1',
  name,
  firstName: name.split(' ')[0]!,
  initials: 'AO',
  avatarUrl: null,
  avatarFocus: null,
  deleted: false,
  timeZone: 'Africa/Lagos',
  cover: 'sand',
  joinedAt: null,
});

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  status: 'confirmed',
  side: 'mentor',
  other: party(),
  startsAt: at(24),
  endsAt: at(25),
  durationMin: 60,
  title: 'School shortlist',
  note: null,
  createdAt: at(-240),
  respondBy: null,
  joinOpensAt: null,
  joinClosesAt: null,
  menteeAttendanceRate: null,
  ...over,
});

const MEMBER: Extract<Viewer, { kind: 'member' }> = {
  kind: 'member',
  id: 'me',
  firstName: 'Gbenga',
  initial: 'G',
  isMentee: false,
  isApprovedMentor: true,
  isMentor: true,
  completedSessions: 0,
  credits: null,
  timeZone: 'Africa/Lagos',
  bookingCounts: { pending: 2, upcoming: 3 },
};

beforeEach(() => {
  vi.setSystemTime(NOW);
  tab = 'upcoming';
  viewer = MEMBER;
  upcoming = remote<Booking[]>([]);
  pending = remote<Booking[]>([]);
  history = hist();
  join.mockReset();
  replace.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('the shell', () => {
  it('a guest is asked to log in, with no tabs behind it', () => {
    viewer = { kind: 'guest' };
    render(<BookingsScreen />);
    expect(screen.getByRole('heading', { name: 'Log in to see your bookings' })).toBeVisible();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('tabs carry their counts, read as words, and History carries none', () => {
    render(<BookingsScreen />);
    expect(screen.getByRole('tab', { name: 'Upcoming, 3 upcoming' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Pending, 2 awaiting a response' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'History' })).toBeVisible();
  });

  it('switching tab puts it in the URL, and Upcoming leaves it out', async () => {
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('tab', { name: /Pending/ }));
    expect(replace).toHaveBeenCalledWith('/bookings?tab=pending', { scroll: false });
  });
});

describe('Upcoming', () => {
  it('loading shows no empty state', () => {
    upcoming = remote<Booking[]>(null, { isLoading: true });
    render(<BookingsScreen />);
    expect(screen.queryByText('No upcoming sessions yet')).not.toBeInTheDocument();
  });

  it('a failed load says so and offers a retry — it never reads as empty', async () => {
    const retry = vi.fn();
    upcoming = remote<Booking[]>(null, { error: { kind: 'server', message: 'x' } as AppError, retry });
    render(<BookingsScreen />);
    expect(screen.getByRole('heading', { name: 'We couldn’t load your bookings' })).toBeVisible();
    expect(screen.queryByText('No upcoming sessions yet')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('offline says to come back, not that something broke', () => {
    upcoming = remote<Booking[]>(null, { error: { kind: 'offline', message: 'x' } as AppError });
    render(<BookingsScreen />);
    expect(screen.getByText('You’re offline. Try again when you reconnect.')).toBeVisible();
  });

  it('empty invites a mentor to open their calendar', () => {
    render(<BookingsScreen />);
    expect(screen.getByRole('heading', { name: 'No upcoming sessions yet' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Update your availability' })).toHaveAttribute(
      'href',
      '/calendar',
    );
  });

  it('empty sends a mentee to Explore instead', () => {
    viewer = { ...MEMBER, isMentor: false, isApprovedMentor: false, isMentee: true };
    render(<BookingsScreen />);
    expect(screen.getByRole('link', { name: 'Find a mentor' })).toHaveAttribute('href', '/explore');
  });

  it('the first session is the hero and the rest are a Later list', () => {
    upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'b', title: 'Visa practice', startsAt: at(48), endsAt: at(49) }),
    ]);
    render(<BookingsScreen />);
    const hero = screen.getByRole('region', { name: 'Next session' });
    expect(within(hero).getByText(/Statement of Purpose session with Amara Okafor/)).toBeVisible();
    const later = screen.getByRole('region', { name: 'Later' });
    expect(within(later).getByText(/Visa practice session with Amara Okafor/)).toBeVisible();
    expect(within(later).queryByText(/Statement of Purpose/)).not.toBeInTheDocument();
  });

  it('Join waits for the window, and says when it opens', () => {
    upcoming = remote([
      booking({ startsAt: at(1), joinOpensAt: at(1 - 5 / 60), joinClosesAt: at(1.25) }),
    ]);
    render(<BookingsScreen />);
    expect(screen.getByRole('button', { name: 'Join session' })).toBeDisabled();
    expect(screen.getByText('Join opens 5 minutes before')).toBeVisible();
  });

  it('inside the window Join works and goes through the API', async () => {
    upcoming = remote([
      booking({ id: 'live', startsAt: at(-0.05), joinOpensAt: at(-0.2), joinClosesAt: at(0.2) }),
    ]);
    render(<BookingsScreen />);
    const button = screen.getByRole('button', { name: 'Join session' });
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(join).toHaveBeenCalledWith('live', expect.anything());
  });

  it('a session whose window has shut offers no Join at all', () => {
    upcoming = remote([booking({ startsAt: at(-2), joinOpensAt: at(-2), joinClosesAt: at(-1) })]);
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Join session' })).not.toBeInTheDocument();
  });

  it('attendance recorded with no venue is said out loud, not treated as a failure', async () => {
    upcoming = remote([
      booking({ id: 'live', startsAt: at(-0.05), joinOpensAt: at(-0.2), joinClosesAt: at(0.2) }),
    ]);
    join.mockImplementation((_id, { onSuccess }) => onSuccess({ meetingUrl: null }));
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Join session' }));
    await waitFor(() =>
      expect(
        screen.getByText('You’re marked as here, but this session has no meeting link yet.'),
      ).toBeInTheDocument(),
    );
  });

  it('reveals five at a time', async () => {
    upcoming = remote([
      booking({ id: 'hero' }),
      ...Array.from({ length: 8 }, (_, i) =>
        booking({ id: `r${i}`, title: `Session ${i}`, startsAt: at(48 + i), endsAt: at(49 + i) }),
      ),
    ]);
    render(<BookingsScreen />);
    const later = screen.getByRole('region', { name: 'Later' });
    expect(within(later).getByText('Showing 5 of 8')).toBeVisible();
    await userEvent.click(within(later).getByRole('button', { name: 'Show 3 more' }));
    // Everything is shown, so the footer goes with it — a button that can
    // reveal nothing is worse than no button.
    expect(within(later).queryByText(/Showing/)).not.toBeInTheDocument();
    expect(within(later).getByText(/Session 7 session with/)).toBeVisible();
  });
});

describe('Pending', () => {
  beforeEach(() => {
    tab = 'pending';
  });

  it('a mentor is told these are theirs to answer', () => {
    pending = remote([booking({ status: 'pending', respondBy: at(5) })]);
    render(<BookingsScreen />);
    expect(screen.getByText(/These mentees asked for a time/)).toBeVisible();
    expect(screen.getByText('Respond within 5h')).toBeVisible();
  });

  it('a mentee’s own request says who it is waiting on, with no countdown', () => {
    pending = remote([booking({ status: 'pending', side: 'mentee', respondBy: at(5) })]);
    render(<BookingsScreen />);
    expect(screen.getByText(/Requests you sent/)).toBeVisible();
    expect(screen.getByText('Waiting for Amara to confirm')).toBeVisible();
    expect(screen.queryByText(/Respond within/)).not.toBeInTheDocument();
  });

  it('a lapsed request stays in the list, labelled, with nothing left to do', () => {
    pending = remote([booking({ status: 'pending', respondBy: at(-1) })]);
    render(<BookingsScreen />);
    expect(screen.getByText('Unconfirmed')).toBeVisible();
    expect(screen.queryByText(/Respond within/)).not.toBeInTheDocument();
  });

  it('empty is about requests, not sessions', () => {
    render(<BookingsScreen />);
    expect(screen.getByRole('heading', { name: 'No pending requests' })).toBeVisible();
  });
});

describe('History', () => {
  beforeEach(() => {
    tab = 'history';
  });

  it('names every outcome the API can send', () => {
    history = hist({
      bookings: [
        booking({ id: '1', status: 'completed' }),
        booking({ id: '2', status: 'cancelled' }),
        booking({ id: '3', status: 'noShow' }),
        booking({ id: '4', status: 'declined' }),
        booking({ id: '5', status: 'expired' }),
      ],
    });
    render(<BookingsScreen />);
    // Scoped to the list: 'Completed' is also a filter chip above it.
    const list = screen.getByRole('region', { name: 'Bookings' });
    for (const label of ['Completed', 'Canceled', 'Missed', 'Declined', 'Unconfirmed'])
      expect(within(list).getByText(label)).toBeVisible();
  });

  it('a past row carries its full date — the day badge alone loses the year', () => {
    history = hist({
      bookings: [booking({ status: 'completed', startsAt: at(-24 * 90), endsAt: at(-24 * 90 + 1) })],
    });
    render(<BookingsScreen />);
    expect(screen.getByText(/Jul 5, 2026/)).toBeVisible();
  });

  it('a filter changes the empty state’s advice', async () => {
    render(<BookingsScreen />);
    expect(screen.getByRole('heading', { name: 'No past sessions yet' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Completed' }));
    expect(screen.getByRole('heading', { name: 'No sessions match these filters' })).toBeVisible();
  });

  it('only a session the viewer booked can be booked again, and never by a mentor', () => {
    history = hist({
      bookings: [
        booking({ id: 'mine', status: 'completed', side: 'mentee' }),
        booking({ id: 'hosted', status: 'completed', side: 'mentor' }),
      ],
    });
    viewer = { ...MEMBER, isMentor: false, isApprovedMentor: false, isMentee: true };
    render(<BookingsScreen />);
    expect(screen.getAllByRole('link', { name: 'Book again' })).toHaveLength(1);

    viewer = MEMBER;
    render(<BookingsScreen />);
    expect(screen.queryAllByRole('link', { name: 'Book again' })).toHaveLength(1);
  });

  it('asks the server for another page when the reveal runs past what is loaded', async () => {
    const loadMore = vi.fn();
    history = hist({
      bookings: Array.from({ length: 5 }, (_, i) => booking({ id: `h${i}`, status: 'completed' })),
      hasMore: true,
      loadMore,
    });
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: /Show 5 more/ }));
    expect(loadMore).toHaveBeenCalled();
  });
});

describe('what time it is for the other person', () => {
  it('is on the hero and on an upcoming row, with the city', () => {
    upcoming = remote([
      booking({ id: 'a', other: { ...party(), timeZone: 'Africa/Lagos' } }),
      booking({
        id: 'b',
        startsAt: at(48),
        endsAt: at(49),
        other: { ...party('Kwame Asante'), timeZone: 'Africa/Accra' },
      }),
    ]);
    render(<BookingsScreen />);
    // The member's own zone is Africa/Lagos, so the hero's Lagos mentee gets no
    // line — it would only repeat the row.
    expect(screen.queryByText(/for Amara in Lagos/)).not.toBeInTheDocument();
    expect(screen.getByText(/for Kwame in Accra/)).toBeVisible();
  });

  it('is left off a past session — nobody can act on it', () => {
    tab = 'history';
    history = hist({
      bookings: [
        booking({
          status: 'completed',
          other: { ...party('Kwame Asante'), timeZone: 'Africa/Accra' },
        }),
      ],
    });
    render(<BookingsScreen />);
    expect(screen.queryByText(/for Kwame in Accra/)).not.toBeInTheDocument();
  });
});
