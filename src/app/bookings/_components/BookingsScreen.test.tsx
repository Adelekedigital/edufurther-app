import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BookingHistoryResult } from '@/lib/api/data/bookings';
import { ApiError } from '@/lib/api/data/errors';
import type { Booking, BookingParty } from '@/types/booking';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import { BookingsScreen } from './BookingsScreen';

let tab = 'upcoming';
let selectedBooking: string | null = null;
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/bookings',
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => {
    const q = new URLSearchParams(tab === 'upcoming' ? '' : `tab=${tab}`);
    if (selectedBooking) q.set('booking', selectedBooking);
    return q;
  },
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
// What `useBooking` was asked to do: the panel must not refetch a loaded row.
let bookingActive = false;
vi.mock('@/lib/api/data/bookings', () => ({
  useUpcomingBookings: () => upcoming,
  usePendingBookings: () => pending,
  useBookingHistory: () => history,
  useJoinSession: () => ({ mutate: join, isPending: false }),
  useBooking: (_id: string | null, _userId: string | null, active: boolean) => {
    bookingActive = active;
    return { data: null, isLoading: false, error: null, retry: vi.fn() };
  },
}));
vi.mock('@/lib/api/data/sessionEvents', () => ({
  useBookingOutcome: () => ({ data: null, isLoading: false, error: null, retry: vi.fn() }),
}));
let answers: { data: unknown; isLoading: boolean; error: unknown; retry: () => void };
vi.mock('@/lib/api/data/sessionAnswers', () => ({
  useBookingAnswers: () => answers,
}));
// The viewer fetches bytes; this screen's tests are about the wiring that opens
// it, so the fetch is stubbed at the data boundary like every other read here.
// The four write actions. Stubbed at the data boundary like every other read
// here; what each one sends is covered in bookingActions.test.tsx.
const actions: Record<string, ReturnType<typeof stubAction>> = {};
function stubAction() {
  return { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null, variables: undefined };
}
vi.mock('@/lib/api/data/bookingActions', () => ({
  useBookingAction: (a: string) => (actions[a] ??= stubAction()),
}));
vi.mock('@/lib/api/data/intakeFiles', () => ({
  useIntakeFile: () => ({ url: 'blob:stub', isLoading: false, error: null, retry: vi.fn() }),
  canPreview: () => true,
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
  attendance: 'pending' as const,
});

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  status: 'confirmed',
  side: 'mentor',
  other: party(),
  myAttendance: 'pending' as const,
  startsAt: at(24),
  endsAt: at(25),
  durationMin: 60,
  title: 'School shortlist',
  note: null,
  answersPreview: null,
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

// jsdom has no matchMedia; the screen reads it to choose aside vs sheet.
// Follows the stub ExploreScreen.test.tsx already uses.
let narrow = false;
beforeEach(() => {
  vi.setSystemTime(NOW);
  narrow = false;
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: narrow,
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  tab = 'upcoming';
  selectedBooking = null;
  bookingActive = false;
  viewer = MEMBER;
  upcoming = remote<Booking[]>([]);
  pending = remote<Booking[]>([]);
  history = hist();
  answers = { data: [], isLoading: false, error: null, retry: vi.fn() };
  for (const a of ['accept', 'decline', 'withdraw', 'cancel']) actions[a] = stubAction();
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
    expect(screen.getByText('These mentees asked for a time.')).toBeVisible();
    expect(screen.getByText('Respond within 5h')).toBeVisible();
  });

  it('a mentee’s own request says who it is waiting on, and never "respond"', () => {
    pending = remote([booking({ status: 'pending', side: 'mentee', respondBy: at(40) })]);
    render(<BookingsScreen />);
    expect(screen.getByText(/Requests you sent/)).toBeVisible();
    expect(screen.getByText('Waiting for Amara to confirm')).toBeVisible();
    expect(screen.queryByText(/Respond within/)).not.toBeInTheDocument();
  });

  it('close to the deadline, the mentee is told how long the mentor has left', () => {
    pending = remote([booking({ status: 'pending', side: 'mentee', respondBy: at(18) })]);
    render(<BookingsScreen />);
    expect(screen.getByText('Amara has 18h left to confirm')).toBeVisible();
    expect(screen.queryByText(/Waiting for/)).not.toBeInTheDocument();
  });

  it('a lapsed request stays in the list, labelled, with nothing left to do', () => {
    pending = remote([booking({ status: 'pending', respondBy: at(-1) })]);
    render(<BookingsScreen />);
    expect(screen.getByText('Expired')).toBeVisible();
    expect(screen.queryByText(/Respond within/)).not.toBeInTheDocument();
  });

  it('a mixed list is addressed to neither side — either line would be wrong', () => {
    pending = remote([
      booking({ id: 'in', status: 'pending', side: 'mentor', respondBy: at(5) }),
      booking({ id: 'out', status: 'pending', side: 'mentee', respondBy: at(5) }),
    ]);
    render(<BookingsScreen />);
    expect(screen.queryByText(/These mentees asked for a time/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Requests you sent/)).not.toBeInTheDocument();
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
    for (const label of ['Completed', 'Canceled', 'Missed', 'Declined', 'Expired'])
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

  it('only a session the viewer booked can be booked again', () => {
    history = hist({
      bookings: [
        booking({ id: 'mine', status: 'completed', side: 'mentee' }),
        booking({ id: 'hosted', status: 'completed', side: 'mentor' }),
      ],
    });
    viewer = { ...MEMBER, isMentor: false, isApprovedMentor: false, isMentee: true };
    render(<BookingsScreen />);
    const links = screen.getAllByRole('link', { name: 'Book again' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/mentors/p1');
  });

  it('a mentor is never offered Book again — mentors cannot book', () => {
    history = hist({
      bookings: [
        booking({ id: 'mine', status: 'completed', side: 'mentee' }),
        booking({ id: 'hosted', status: 'completed', side: 'mentor' }),
      ],
    });
    viewer = MEMBER;
    render(<BookingsScreen />);
    expect(screen.queryByRole('link', { name: 'Book again' })).not.toBeInTheDocument();
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

describe('Join, when the browser gets in the way', () => {
  const live = () =>
    booking({ id: 'live', startsAt: at(-0.05), joinOpensAt: at(-0.2), joinClosesAt: at(0.2) });

  it('a blocked popup offers the link instead of looking like a dead button', async () => {
    upcoming = remote([live()]);
    join.mockImplementation((_id, { onSuccess }) =>
      onSuccess({ meetingUrl: 'https://meet.test/abc' }),
    );
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Join session' }));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Open the session' })).toHaveAttribute(
        'href',
        'https://meet.test/abc',
      ),
    );
    expect(screen.getByText(/already marked as here/)).toBeVisible();
    open.mockRestore();
  });

  it('a 409 says the window is shut, not that something broke', async () => {
    upcoming = remote([live()]);
    join.mockImplementation((_id, { onError }) => onError(new ApiError(409)));
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Join session' }));
    await waitFor(() =>
      expect(screen.getByText('This session isn’t open to join right now.')).toBeInTheDocument(),
    );
  });
});

describe('a list already on screen survives a failed refetch', () => {
  it('keeps the rows rather than replacing them with an error', () => {
    tab = 'history';
    history = hist({
      bookings: [booking({ status: 'completed' })],
      error: { kind: 'server', message: 'x' } as AppError,
    });
    render(<BookingsScreen />);
    expect(screen.getByText(/School shortlist session with/)).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'We couldn’t load your bookings' }),
    ).not.toBeInTheDocument();
  });

  it('a failed "Show more" is said under the button', () => {
    tab = 'history';
    history = hist({
      bookings: Array.from({ length: 6 }, (_, i) => booking({ id: `h${i}`, status: 'completed' })),
      loadMoreError: { kind: 'server', message: 'x' } as AppError,
    });
    render(<BookingsScreen />);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load more. Try again.');
  });
});

describe('the details panel', () => {
  beforeEach(() => {
    upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'b', title: 'Visa practice', startsAt: at(48), endsAt: at(49) }),
    ]);
  });

  it('every row offers it, and the menu says which way it goes', async () => {
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: /More options for Visa practice/ }));
    expect(screen.getByRole('menuitem', { name: 'See details' })).toBeVisible();
  });

  it('opening it puts the booking in the URL', async () => {
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: /More options for Visa practice/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'See details' }));
    expect(replace).toHaveBeenCalledWith('/bookings?booking=b', { scroll: false });
  });

  it('a ?booking= link opens it, with the row marked', () => {
    selectedBooking = 'b';
    render(<BookingsScreen />);
    expect(screen.getByRole('complementary', { name: 'Booking details' })).toBeVisible();
  });

  it('closing it takes the booking back out of the URL', async () => {
    selectedBooking = 'b';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(replace).toHaveBeenCalledWith('/bookings', { scroll: false });
  });

  it('a booking already in the list is not fetched again', () => {
    selectedBooking = 'b';
    render(<BookingsScreen />);
    // useBooking is called with active=false when the row is already loaded.
    expect(bookingActive).toBe(false);
  });

  it('a booking the list does not hold is fetched', () => {
    selectedBooking = 'not-in-any-list';
    render(<BookingsScreen />);
    expect(bookingActive).toBe(true);
  });
});

describe('the panel changes shape, not content', () => {
  beforeEach(() => {
    upcoming = remote([booking({ id: 'b', title: 'Visa practice' })]);
    selectedBooking = 'b';
  });

  it('is an aside beside the list on a wide screen', () => {
    render(<BookingsScreen />);
    expect(screen.getByRole('complementary', { name: 'Booking details' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('takes the whole screen on a phone, as a dialog', async () => {
    narrow = true;
    render(<BookingsScreen />);
    expect(await screen.findByRole('dialog', { name: 'Booking details' })).toBeVisible();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});

describe('the review round on the panel', () => {
  beforeEach(() => {
    upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'b', title: 'Visa practice', startsAt: at(48), endsAt: at(49) }),
    ]);
  });

  it('the next session can be opened too — it had no way in', async () => {
    render(<BookingsScreen />);
    const hero = screen.getByRole('region', { name: 'Next session' });
    await userEvent.click(within(hero).getByRole('button', { name: /More options/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'See details' }));
    expect(replace).toHaveBeenCalledWith('/bookings?booking=a', { scroll: false });
  });

  it('switching tab closes the panel: its row is no longer on screen', async () => {
    selectedBooking = 'b';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('tab', { name: /History/ }));
    expect(replace).toHaveBeenCalledWith('/bookings?tab=history', { scroll: false });
  });

  it('the aside takes focus when it opens, so the action is not silent', async () => {
    selectedBooking = 'b';
    render(<BookingsScreen />);
    const aside = await screen.findByRole('complementary', { name: 'Booking details' });
    await waitFor(() => expect(aside).toHaveFocus());
  });
});

describe('the booking form answers, wired up', () => {
  beforeEach(() => {
    upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'b', title: 'Visa practice', startsAt: at(48), endsAt: at(49) }),
    ]);
  });

  const PDF = {
    id: 'f1',
    filename: 'SOP-draft-v2.pdf',
    contentType: 'application/pdf' as const,
    size: 182_400,
    available: true,
  };
  const some = [
    { questionId: 'q1', question: 'Q1?', kind: 'free_text' as const, retired: false, text: 'A1.', file: null },
    { questionId: 'q2', question: 'Q2?', kind: 'free_text' as const, retired: false, text: 'A2.', file: null },
    { questionId: 'q3', question: 'Q3?', kind: 'free_text' as const, retired: false, text: 'A3.', file: null },
  ];

  it('the panel shows them, and the disclosure reveals the rest', async () => {
    selectedBooking = 'b';
    answers = { data: some, isLoading: false, error: null, retry: vi.fn() };
    render(<BookingsScreen />);
    expect(screen.queryByText('A3.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show all 3 answers' }));
    expect(screen.getByText('A3.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText('A3.')).not.toBeInTheDocument();
  });

  it('a file answer opens the viewer over the panel', async () => {
    selectedBooking = 'b';
    answers = {
      data: [{ ...some[0]!, kind: 'file_upload' as const, text: PDF.filename, file: PDF }],
      isLoading: false,
      error: null,
      retry: vi.fn(),
    };
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Open SOP-draft-v2.pdf' }));
    // The panel is still there underneath: the viewer is stacked, not a
    // replacement, and Escape must close only the top one.
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('complementary', { name: 'Booking details' })).toBeVisible();
  });
});

describe('the answers preview on the rows', () => {
  const withPreview = (over = {}) =>
    booking({
      id: 'b',
      title: 'Visa practice',
      startsAt: at(48),
      endsAt: at(49),
      answersPreview: {
        count: 4,
        first: { question: 'What do you want to cover?', text: 'Nine programs.' },
      },
      ...over,
    });

  it('shows the first answer on the row, under the question that was asked', () => {
    // Two, because the first upcoming booking is the hero — and the hero gets
    // the link alone, not the box.
    upcoming = remote([booking({ id: 'a', title: 'Statement of Purpose' }), withPreview()]);
    render(<BookingsScreen />);
    expect(screen.getByText('What do you want to cover?')).toBeVisible();
    expect(screen.getByText('Nine programs.')).toBeVisible();
  });

  it('opens the panel with every answer already shown, in one step', async () => {
    upcoming = remote([booking({ id: 'a', title: 'Statement of Purpose' }), withPreview()]);
    // The panel is already on this booking, so the expansion is observable;
    // `select` only rewrites the URL in this harness.
    selectedBooking = 'b';
    answers = {
      data: [1, 2, 3, 4].map((i) => ({
        questionId: `q${i}`,
        question: `Q${i}?`,
        kind: 'free_text' as const,
        retired: false,
        text: `A${i}.`,
        file: null,
      })),
      isLoading: false,
      error: null,
      retry: vi.fn(),
    };
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: /See all 4 answers for Visa practice/ }));
    expect(replace).toHaveBeenCalledWith('/bookings?booking=b', { scroll: false });
    // Expanded on arrival, rather than opening collapsed and then jumping.
    expect(screen.getByRole('button', { name: 'Show less' })).toBeVisible();
    expect(screen.getByText('A4.')).toBeVisible();
  });

  it('a booking whose form was never answered shows no box', () => {
    upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      withPreview({ answersPreview: null }),
    ]);
    render(<BookingsScreen />);
    expect(screen.queryByText(/See all \d+ answers/)).not.toBeInTheDocument();
    expect(screen.queryByText('Nine programs.')).not.toBeInTheDocument();
  });

  it('the hero offers the link, not the box — that card has its own note', async () => {
    upcoming = remote([
      withPreview({ id: 'a', title: 'Statement of Purpose', startsAt: at(2), endsAt: at(3) }),
    ]);
    render(<BookingsScreen />);
    // The link names its booking like every other one.
    expect(
      screen.getByRole('button', { name: /See all 4 answers for Statement of Purpose/ }),
    ).toBeVisible();
    // ...and the hero shows no preview box, only the link.
    expect(screen.queryByText('What do you want to cover?')).not.toBeInTheDocument();
  });

  it('the hero link opens the panel expanded, like the rows', async () => {
    upcoming = remote([
      withPreview({ id: 'a', title: 'Statement of Purpose', startsAt: at(2), endsAt: at(3) }),
    ]);
    selectedBooking = 'a';
    answers = {
      data: [1, 2, 3, 4].map((i) => ({
        questionId: `q${i}`,
        question: `Q${i}?`,
        kind: 'free_text' as const,
        retired: false,
        text: `A${i}.`,
        file: null,
      })),
      isLoading: false,
      error: null,
      retry: vi.fn(),
    };
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: /See all 4 answers/ }));
    expect(screen.getByRole('button', { name: 'Show less' })).toBeVisible();
    expect(screen.getByText('A4.')).toBeVisible();
  });

  it('History rows never carry it — the design shows no preview there', async () => {
    history = hist({
      bookings: [withPreview({ status: 'completed', startsAt: at(-48), endsAt: at(-47) })],
    });
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('tab', { name: /History/ }));
    expect(screen.queryByText('What do you want to cover?')).not.toBeInTheDocument();
  });
});

describe('the desktop panel is not a keyboard dead end', () => {
  beforeEach(() => {
    upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'b', title: 'Visa practice', startsAt: at(48), endsAt: at(49) }),
    ]);
  });

  it('Escape closes it when focus is inside', async () => {
    selectedBooking = 'b';
    render(<BookingsScreen />);
    const panel = screen.getByRole('complementary', { name: 'Booking details' });
    expect(panel).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(replace).toHaveBeenCalledWith('/bookings', { scroll: false });
  });

  it('Escape elsewhere on the page is left alone', async () => {
    selectedBooking = 'b';
    render(<BookingsScreen />);
    // The aside sits beside the page rather than over it, so it must not
    // swallow Escape from a menu or dialog that is not inside it.
    screen.getByRole('tab', { name: /Upcoming/ }).focus();
    await userEvent.keyboard('{Escape}');
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('the actions appear only where they can succeed', () => {
  const pendingRow = (over = {}) =>
    booking({ id: 'p1', title: 'SOP review', status: 'pending', respondBy: at(5), startsAt: at(48), endsAt: at(49), ...over });

  it('a mentor answers a request on the row itself', async () => {
    viewer = { ...MEMBER, isMentor: true };
    pending = remote([pendingRow({ side: 'mentor' })]);
    tab = 'pending';
    render(<BookingsScreen />);
    expect(screen.getByRole('button', { name: 'Accept' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeVisible();
  });

  it('accepting goes straight through — there is nothing to warn about', async () => {
    viewer = { ...MEMBER, isMentor: true };
    pending = remote([pendingRow({ side: 'mentor' })]);
    tab = 'pending';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(actions.accept!.mutate).toHaveBeenCalledWith({ bookingId: 'p1' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('declining asks first, because it cannot be undone', async () => {
    viewer = { ...MEMBER, isMentor: true };
    pending = remote([pendingRow({ side: 'mentor' })]);
    tab = 'pending';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(screen.getByRole('dialog', { name: 'Decline this request' })).toBeVisible();
    expect(actions.decline!.mutate).not.toHaveBeenCalled();
  });

  it('a mentee gets Withdraw in the menu, and no Accept anywhere', async () => {
    pending = remote([pendingRow({ side: 'mentee' })]);
    tab = 'pending';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /More options for SOP review/ }));
    expect(screen.getByRole('menuitem', { name: 'Withdraw request' })).toBeVisible();
  });

  it('a lapsed request offers nothing — it is the backend’s to expire', async () => {
    viewer = { ...MEMBER, isMentor: true };
    pending = remote([pendingRow({ side: 'mentor', respondBy: at(-1) })]);
    tab = 'pending';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });

  it('a session inside ten minutes offers no Cancel', async () => {
    upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'soon', title: 'Nearly now', startsAt: at(0.1), endsAt: at(1) }),
    ]);
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: /More options for Nearly now/ }));
    expect(screen.queryByRole('menuitem', { name: 'Cancel session' })).not.toBeInTheDocument();
  });

  it('a session further out does', async () => {
    upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'later', title: 'Later one', startsAt: at(48), endsAt: at(49) }),
    ]);
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: /More options for Later one/ }));
    expect(screen.getByRole('menuitem', { name: 'Cancel session' })).toBeVisible();
  });
});

describe('accepting a request that runs into another session', () => {
  it('warns before accepting, and says which session and when', () => {
    viewer = { ...MEMBER, isMentor: true };
    upcoming = remote([
      booking({ id: 'u1', title: 'Already booked', startsAt: at(10), endsAt: at(11) }),
    ]);
    pending = remote([
      booking({ id: 'p1', title: 'Clashing request', status: 'pending', side: 'mentor', respondBy: at(5), startsAt: at(10.5), endsAt: at(11.5) }),
    ]);
    tab = 'pending';
    render(<BookingsScreen />);
    expect(screen.getByText(/This overlaps your session with/)).toBeVisible();
    expect(screen.getByText(/Accepting books both/)).toBeVisible();
  });

  it('does not block it — accepting both may be the intention', async () => {
    viewer = { ...MEMBER, isMentor: true };
    upcoming = remote([booking({ id: 'u1', startsAt: at(10), endsAt: at(11) })]);
    pending = remote([
      booking({ id: 'p1', status: 'pending', side: 'mentor', respondBy: at(5), startsAt: at(10.5), endsAt: at(11.5) }),
    ]);
    tab = 'pending';
    render(<BookingsScreen />);
    const accept = screen.getByRole('button', { name: 'Accept' });
    expect(accept).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(accept);
    expect(actions.accept!.mutate).toHaveBeenCalledWith({ bookingId: 'p1' });
  });

  it('back-to-back sessions carry no warning', () => {
    viewer = { ...MEMBER, isMentor: true };
    upcoming = remote([booking({ id: 'u1', startsAt: at(9), endsAt: at(10) })]);
    pending = remote([
      booking({ id: 'p1', status: 'pending', side: 'mentor', respondBy: at(5), startsAt: at(10), endsAt: at(11) }),
    ]);
    tab = 'pending';
    render(<BookingsScreen />);
    expect(screen.queryByText(/This overlaps your session with/)).not.toBeInTheDocument();
  });
});
