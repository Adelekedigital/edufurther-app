import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api/data/errors';
import type { Booking } from '@/types/booking';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import { BookingsScreen } from './BookingsScreen';
import {
  actions,
  at,
  booking,
  h,
  hist,
  MEMBER,
  NOW,
  party,
  push,
  remote,
  replace,
  resetHarness,
} from './bookingsScreen.harness';
import {
  expectLockedPage,
  expectNoLock,
  explainer,
  flags,
  resetFlags,
  viewers,
} from '@/app/_shell/lockedPage.harness';

// The data hooks, mocked. Hoisted above the imports, so each factory
// reaches the harness through a dynamic import rather than a binding
// that is not initialised yet — the shape profileScreen.harness uses.
vi.mock('next/navigation', async () =>
  (await import('./bookingsScreen.harness')).mocks.navigation(),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./bookingsScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/bookings', async () =>
  (await import('./bookingsScreen.harness')).mocks.bookings(),
);
vi.mock('@/lib/api/data/sessionEvents', async () =>
  (await import('./bookingsScreen.harness')).mocks.sessionEvents(),
);
vi.mock('@/lib/api/data/sessionAnswers', async () =>
  (await import('./bookingsScreen.harness')).mocks.sessionAnswers(),
);
vi.mock('@/lib/api/data/bookingActions', async () =>
  (await import('./bookingsScreen.harness')).mocks.bookingActions(),
);
vi.mock('@/lib/api/data/reviewableSessions', async () =>
  (await import('./bookingsScreen.harness')).mocks.reviewableSessions(),
);
vi.mock('@/lib/api/data/reminders', async () =>
  (await import('./bookingsScreen.harness')).mocks.reminders(),
);
vi.mock('@/lib/api/data/reviewWrite', async () =>
  (await import('@/app/_sessions/reviewAndRebook.harness')).reviewAndRebookMocks.reviewWrite(),
);
vi.mock('@/app/_reviews/ReviewDialog', async () =>
  (await import('@/app/_sessions/reviewAndRebook.harness')).reviewAndRebookMocks.reviewDialog(),
);
vi.mock('@/app/_shell/BookingLauncher/BookingLauncher', async () =>
  (await import('@/app/_sessions/reviewAndRebook.harness')).reviewAndRebookMocks.bookingLauncher(),
);
vi.mock('@/lib/api/data/booking', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useSlots: () => ({ data: [], isLoading: false, error: null, retry: vi.fn() }),
}));
vi.mock('@/lib/api/data/intakeFiles', async () =>
  (await import('./bookingsScreen.harness')).mocks.intakeFiles(),
);
// The setup lock's flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);

beforeEach(() => {
  resetHarness();
  resetFlags();
});
afterEach(() => vi.useRealTimers());
describe('the shell', () => {
  it('a guest is asked to log in, with no tabs behind it', () => {
    h.viewer = { kind: 'guest' };
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

  it('the Pending count is the rows on screen, not the server’s own figure', async () => {
    // The server's aggregate still counts a request whose deadline has passed,
    // until the status itself flips — while the list drops it into History.
    // Trusting the aggregate read "3 awaiting a response" over a list of 2
    // (GitHub review, PR 235).
    h.tab = 'pending';
    h.pending = remote([booking({ status: 'pending', respondBy: at(5) })]);
    render(<BookingsScreen />);
    // `bookingCounts.pending` is 2 in the fixture; one row is on screen.
    expect(screen.getByRole('tab', { name: 'Pending, 1 awaiting a response' })).toBeVisible();
  });

  it('and falls back to the server’s figure where no list contradicts it', () => {
    // On History the Pending query is idle. A tab reading nothing would hide a
    // count the viewer had just seen.
    h.tab = 'history';
    render(<BookingsScreen />);
    expect(screen.getByRole('tab', { name: 'Pending, 2 awaiting a response' })).toBeVisible();
  });

  it('switching tab puts it in the URL, and Upcoming leaves it out', async () => {
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('tab', { name: /Pending/ }));
    expect(replace).toHaveBeenCalledWith('/bookings?tab=pending', { scroll: false });
  });
});

describe('Upcoming', () => {
  it('loading shows no empty state', () => {
    h.upcoming = remote<Booking[]>(null, { isLoading: true });
    render(<BookingsScreen />);
    expect(screen.queryByText('No upcoming sessions yet')).not.toBeInTheDocument();
  });

  it('a failed load says so and offers a retry — it never reads as empty', async () => {
    const retry = vi.fn();
    h.upcoming = remote<Booking[]>(null, {
      error: { kind: 'server', message: 'x' } as AppError,
      retry,
    });
    render(<BookingsScreen />);
    expect(screen.getByRole('heading', { name: 'We couldn’t load your bookings' })).toBeVisible();
    expect(screen.queryByText('No upcoming sessions yet')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('offline says to come back, not that something broke', () => {
    h.upcoming = remote<Booking[]>(null, { error: { kind: 'offline', message: 'x' } as AppError });
    render(<BookingsScreen />);
    expect(screen.getByText('You’re offline. Try again when you reconnect.')).toBeVisible();
  });

  it('empty invites a mentor to open their calendar', () => {
    render(<BookingsScreen />);
    expect(screen.getByRole('heading', { name: 'No upcoming sessions yet' })).toBeVisible();
    expect(screen.getByText(/Want more sessions\?/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Update your availability' })).toHaveAttribute(
      'href',
      '/calendar',
    );
  });

  it('empty sends a mentee to Explore instead', () => {
    h.viewer = { ...MEMBER, isMentor: false, isApprovedMentor: false, isMentee: true };
    render(<BookingsScreen />);
    expect(screen.getByRole('link', { name: 'Find a mentor' })).toHaveAttribute('href', '/explore');
  });

  it('the first session is the hero and the rest are a Later list', () => {
    h.upcoming = remote([
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
    h.upcoming = remote([
      booking({ startsAt: at(1), joinOpensAt: at(1 - 5 / 60), joinClosesAt: at(1.25) }),
    ]);
    render(<BookingsScreen />);
    expect(screen.getByRole('button', { name: 'Join session' })).toBeDisabled();
    expect(screen.getByText('Join opens 5 min before')).toBeVisible();
  });

  it('inside the window Join opens the session’s own page, where joining happens', () => {
    h.upcoming = remote([
      booking({ id: 'live', startsAt: at(-0.05), joinOpensAt: at(-0.2), joinClosesAt: at(0.2) }),
    ]);
    render(<BookingsScreen />);
    expect(screen.getByRole('link', { name: 'Join session' })).toHaveAttribute(
      'href',
      '/sessions/live',
    );
  });

  it('a session whose window has shut offers no Join at all', () => {
    h.upcoming = remote([booking({ startsAt: at(-2), joinOpensAt: at(-2), joinClosesAt: at(-1) })]);
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Join session' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Join session' })).not.toBeInTheDocument();
  });

  it('reveals five at a time', async () => {
    h.upcoming = remote([
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
    h.tab = 'pending';
  });

  it('a mentor is told these are theirs to answer', () => {
    h.pending = remote([booking({ status: 'pending', respondBy: at(5) })]);
    render(<BookingsScreen />);
    expect(
      screen.getByText(
        'These mentees asked for a time. Accept to confirm it, or decline so they can pick another.',
      ),
    ).toBeVisible();
    expect(screen.getByText('Respond within 5h')).toBeVisible();
  });

  it('a mentee’s own request says who it is waiting on, and never "respond"', () => {
    h.pending = remote([booking({ status: 'pending', side: 'mentee', respondBy: at(40) })]);
    render(<BookingsScreen />);
    expect(screen.getByText(/Requests you sent/)).toBeVisible();
    expect(screen.getByText('Waiting for Amara to confirm')).toBeVisible();
    expect(screen.queryByText(/Respond within/)).not.toBeInTheDocument();
  });

  it('close to the deadline, the mentee is told how long the mentor has left', () => {
    h.pending = remote([booking({ status: 'pending', side: 'mentee', respondBy: at(18) })]);
    render(<BookingsScreen />);
    expect(screen.getByText('Amara has 18h left to confirm')).toBeVisible();
    expect(screen.queryByText(/Waiting for/)).not.toBeInTheDocument();
  });

  it('a lapsed request stays in the list, labelled, with nothing left to do', () => {
    h.pending = remote([booking({ status: 'pending', respondBy: at(-1) })]);
    render(<BookingsScreen />);
    expect(screen.getByText('Expired')).toBeVisible();
    expect(screen.queryByText(/Respond within/)).not.toBeInTheDocument();
  });

  it('a mixed list is addressed to neither side — either line would be wrong', () => {
    h.pending = remote([
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
    h.tab = 'history';
  });

  it('names every outcome the API can send', () => {
    h.history = hist({
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
    h.history = hist({
      bookings: [
        booking({ status: 'completed', startsAt: at(-24 * 90), endsAt: at(-24 * 90 + 1) }),
      ],
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

  it('?filter=missed opens History with Missed on (Mentee Home’s "View missed")', () => {
    h.tab = 'upcoming';
    h.filter = 'missed';
    render(<BookingsScreen />);
    // No `tab=history` on the link: the filter is a way into History.
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Missed' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Completed' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('the link’s filter is only the way in: a chip change drops it from the URL', async () => {
    h.filter = 'missed';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Missed' }));
    expect(replace).toHaveBeenLastCalledWith('/bookings?tab=history', { scroll: false });
  });

  it('an unknown ?filter= is ignored', () => {
    h.filter = 'everything';
    render(<BookingsScreen />);
    for (const name of ['Completed', 'Didn’t happen', 'Missed'])
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
  });

  it('only a session the viewer booked can be booked again', () => {
    h.history = hist({
      bookings: [
        booking({ id: 'mine', status: 'completed', side: 'mentee' }),
        booking({ id: 'hosted', status: 'completed', side: 'mentor' }),
      ],
    });
    h.viewer = { ...MEMBER, isMentor: false, isApprovedMentor: false, isMentee: true };
    render(<BookingsScreen />);
    // A button: the booking modal opens on this page (PRD Mentee Bookings).
    expect(screen.getAllByRole('button', { name: 'Book again' })).toHaveLength(1);
  });

  it('a mentor is never offered Book again — mentors cannot book', () => {
    h.history = hist({
      bookings: [
        booking({ id: 'mine', status: 'completed', side: 'mentee' }),
        booking({ id: 'hosted', status: 'completed', side: 'mentor' }),
      ],
    });
    h.viewer = MEMBER;
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Book again' })).not.toBeInTheDocument();
  });

  it('asks the server for another page when the reveal runs past what is loaded', async () => {
    const loadMore = vi.fn();
    h.history = hist({
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
    h.upcoming = remote([
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
    h.tab = 'history';
    h.history = hist({
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

describe('a list already on screen survives a failed refetch', () => {
  it('keeps the rows rather than replacing them with an error', () => {
    h.tab = 'history';
    h.history = hist({
      bookings: [booking({ status: 'completed' })],
      error: { kind: 'server', message: 'x' } as AppError,
    });
    render(<BookingsScreen />);
    expect(screen.getByText(/School shortlist session with/)).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'We couldn’t load your bookings' }),
    ).not.toBeInTheDocument();
  });

  it('a failed "Show more" is said where the click was, with Try again (LoadMore)', () => {
    h.tab = 'history';
    h.history = hist({
      bookings: Array.from({ length: 6 }, (_, i) => booking({ id: `h${i}`, status: 'completed' })),
      loadMoreError: { kind: 'server', message: 'x' } as AppError,
    });
    render(<BookingsScreen />);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load more. Try again.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('the details panel', () => {
  beforeEach(() => {
    h.upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'b', title: 'Visa practice', startsAt: at(48), endsAt: at(49) }),
    ]);
  });

  it('every row offers it in the open, named by its own booking', () => {
    render(<BookingsScreen />);
    // One press, not two, and the name says which row it belongs to — a list
    // of identical "Details" tells a screen-reader user nothing.
    expect(screen.getByRole('button', { name: /^Details for .*Visa practice/ })).toBeVisible();
    expect(
      screen.getByRole('button', { name: /^Details for .*Statement of Purpose/ }),
    ).toBeVisible();
  });

  it('opening it puts the booking in the URL', async () => {
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Details for .*Visa practice/ }));
    expect(replace).toHaveBeenCalledWith('/bookings?booking=b', { scroll: false });
  });

  it('a ?booking= link opens it, with the row marked', () => {
    h.selectedBooking = 'b';
    render(<BookingsScreen />);
    expect(screen.getByRole('complementary', { name: 'Booking details' })).toBeVisible();
  });

  it('closing it takes the booking back out of the URL', async () => {
    h.selectedBooking = 'b';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(replace).toHaveBeenCalledWith('/bookings', { scroll: false });
  });

  it('a booking already in the list is not fetched again', () => {
    h.selectedBooking = 'b';
    render(<BookingsScreen />);
    // useBooking is called with active=false when the row is already loaded.
    expect(h.bookingActive).toBe(false);
  });

  it('a booking the list does not hold is fetched', () => {
    h.selectedBooking = 'not-in-any-list';
    render(<BookingsScreen />);
    expect(h.bookingActive).toBe(true);
  });
});

describe('the panel changes shape, not content', () => {
  beforeEach(() => {
    h.upcoming = remote([booking({ id: 'b', title: 'Visa practice' })]);
    h.selectedBooking = 'b';
  });

  it('is an aside beside the list on a wide screen', () => {
    render(<BookingsScreen />);
    expect(screen.getByRole('complementary', { name: 'Booking details' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('takes the whole screen on a phone, as a dialog', async () => {
    h.narrow = true;
    render(<BookingsScreen />);
    expect(await screen.findByRole('dialog', { name: 'Booking details' })).toBeVisible();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});

describe('the review round on the panel', () => {
  beforeEach(() => {
    h.upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'b', title: 'Visa practice', startsAt: at(48), endsAt: at(49) }),
    ]);
  });

  it('the next session opens the same way the rows do', async () => {
    // It used to be two presses behind a ⋯; it is the same labelled button as
    // every row below it now, so the hero does not read as another component.
    render(<BookingsScreen />);
    const hero = screen.getByRole('region', { name: 'Next session' });
    await userEvent.click(within(hero).getByRole('button', { name: /^Details for / }));
    expect(replace).toHaveBeenCalledWith('/bookings?booking=a', { scroll: false });
  });

  it('pressing it again closes the panel, and says so while open', async () => {
    // The direction the ⋯ used to state in its label. The button cannot say
    // it, so `aria-expanded` is the only thing carrying it — and the URL is
    // the only thing proving the second press closes rather than reopens.
    h.selectedBooking = 'b';
    render(<BookingsScreen />);
    const open = screen.getByRole('button', { name: /^Details for .*Visa practice/ });
    expect(open).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(open);
    expect(replace).toHaveBeenCalledWith('/bookings', { scroll: false });
  });

  it('switching tab closes the panel: its row is no longer on screen', async () => {
    h.selectedBooking = 'b';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('tab', { name: /History/ }));
    expect(replace).toHaveBeenCalledWith('/bookings?tab=history', { scroll: false });
  });

  it('the aside takes focus when it opens, so the action is not silent', async () => {
    h.selectedBooking = 'b';
    render(<BookingsScreen />);
    const aside = await screen.findByRole('complementary', { name: 'Booking details' });
    await waitFor(() => expect(aside).toHaveFocus());
  });
});

describe('the booking form answers, wired up', () => {
  beforeEach(() => {
    h.upcoming = remote([
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
    {
      questionId: 'q1',
      question: 'Q1?',
      kind: 'free_text' as const,
      retired: false,
      answered: true,
      required: null,
      text: 'A1.',
      file: null,
    },
    {
      questionId: 'q2',
      question: 'Q2?',
      kind: 'free_text' as const,
      retired: false,
      answered: true,
      required: null,
      text: 'A2.',
      file: null,
    },
    {
      questionId: 'q3',
      question: 'Q3?',
      kind: 'free_text' as const,
      retired: false,
      answered: true,
      required: null,
      text: 'A3.',
      file: null,
    },
  ];

  it('the panel shows them, and the disclosure reveals the rest', async () => {
    h.selectedBooking = 'b';
    h.answers = { data: some, isLoading: false, error: null, retry: vi.fn() };
    render(<BookingsScreen />);
    expect(screen.queryByText('A3.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show all 3 answers' }));
    expect(screen.getByText('A3.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText('A3.')).not.toBeInTheDocument();
  });

  it('a file answer opens the viewer over the panel', async () => {
    h.selectedBooking = 'b';
    h.answers = {
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
    h.upcoming = remote([booking({ id: 'a', title: 'Statement of Purpose' }), withPreview()]);
    render(<BookingsScreen />);
    expect(screen.getByText('What do you want to cover?')).toBeVisible();
    expect(screen.getByText('Nine programs.')).toBeVisible();
  });

  it('opens the panel with every answer already shown, in one step', async () => {
    h.upcoming = remote([booking({ id: 'a', title: 'Statement of Purpose' }), withPreview()]);
    // The panel is already on this booking, so the expansion is observable;
    // `select` only rewrites the URL in this harness.
    h.selectedBooking = 'b';
    h.answers = {
      data: [1, 2, 3, 4].map((i) => ({
        questionId: `q${i}`,
        question: `Q${i}?`,
        kind: 'free_text' as const,
        retired: false,
        answered: true,
        required: null,
        text: `A${i}.`,
        file: null,
      })),
      isLoading: false,
      error: null,
      retry: vi.fn(),
    };
    render(<BookingsScreen />);
    await userEvent.click(
      screen.getByRole('button', { name: /See all 4 answers for Visa practice/ }),
    );
    expect(replace).toHaveBeenCalledWith('/bookings?booking=b', { scroll: false });
    // Expanded on arrival, rather than opening collapsed and then jumping.
    expect(screen.getByRole('button', { name: 'Show less' })).toBeVisible();
    expect(screen.getByText('A4.')).toBeVisible();
  });

  it('a booking whose form was never answered shows no box', () => {
    h.upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      withPreview({ answersPreview: null }),
    ]);
    render(<BookingsScreen />);
    expect(screen.queryByText(/See all \d+ answers/)).not.toBeInTheDocument();
    expect(screen.queryByText('Nine programs.')).not.toBeInTheDocument();
  });

  it('the hero shows the first answer under its question, then the link (PRD Mentor Bookings)', async () => {
    h.upcoming = remote([
      withPreview({
        id: 'a',
        title: 'Statement of Purpose',
        startsAt: at(2),
        endsAt: at(3),
        note: 'A free note.',
      }),
    ]);
    render(<BookingsScreen />);
    expect(screen.getByText('What do you want to cover?')).toBeVisible();
    expect(screen.getByText('Nine programs.')).toBeVisible();
    // The link names its booking like every other one.
    expect(
      screen.getByRole('button', { name: /See all 4 answers for Statement of Purpose/ }),
    ).toBeVisible();
    // The free note stays in the panel; the card shows the form.
    expect(screen.queryByText('A free note.')).not.toBeInTheDocument();
  });

  it('the hero keeps its link when the first answer is blank', () => {
    h.upcoming = remote([
      withPreview({
        id: 'a',
        title: 'Statement of Purpose',
        startsAt: at(2),
        endsAt: at(3),
        answersPreview: { count: 3, first: { question: 'What do you want to cover?', text: '' } },
      }),
    ]);
    render(<BookingsScreen />);
    expect(
      screen.getByRole('button', { name: /See all 3 answers for Statement of Purpose/ }),
    ).toBeVisible();
  });

  it('a hero booking with only a note shows the note', () => {
    h.upcoming = remote([
      booking({ id: 'a', startsAt: at(2), endsAt: at(3), note: 'A free note.' }),
    ]);
    render(<BookingsScreen />);
    expect(screen.getByText('Note from Amara')).toBeVisible();
    expect(screen.getByText('A free note.')).toBeVisible();
  });

  it('the hero link opens the panel expanded, like the rows', async () => {
    h.upcoming = remote([
      withPreview({ id: 'a', title: 'Statement of Purpose', startsAt: at(2), endsAt: at(3) }),
    ]);
    h.selectedBooking = 'a';
    h.answers = {
      data: [1, 2, 3, 4].map((i) => ({
        questionId: `q${i}`,
        question: `Q${i}?`,
        kind: 'free_text' as const,
        retired: false,
        answered: true,
        required: null,
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
    h.history = hist({
      bookings: [withPreview({ status: 'completed', startsAt: at(-48), endsAt: at(-47) })],
    });
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('tab', { name: /History/ }));
    expect(screen.queryByText('What do you want to cover?')).not.toBeInTheDocument();
  });
});

describe('the desktop panel is not a keyboard dead end', () => {
  beforeEach(() => {
    h.upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'b', title: 'Visa practice', startsAt: at(48), endsAt: at(49) }),
    ]);
  });

  it('Escape closes it when focus is inside', async () => {
    h.selectedBooking = 'b';
    render(<BookingsScreen />);
    const panel = screen.getByRole('complementary', { name: 'Booking details' });
    expect(panel).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(replace).toHaveBeenCalledWith('/bookings', { scroll: false });
  });

  it('Escape elsewhere on the page is left alone', async () => {
    h.selectedBooking = 'b';
    render(<BookingsScreen />);
    // The aside sits beside the page rather than over it, so it must not
    // swallow Escape from a menu or dialog that is not inside it.
    screen.getByRole('tab', { name: /Upcoming/ }).focus();
    await userEvent.keyboard('{Escape}');
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('the setup lock: /bookings opened by URL (PRD "App shell and access")', () => {
  it.each([
    ['an unfinished mentee', viewers.menteeUnfinished, explainer.menteeSetup('Bookings')],
    ['an unfinished mentor', viewers.mentorUnfinished, explainer.mentorSetup('Bookings')],
    ['a mentor sign-up, not started', viewers.mentorSignup, explainer.mentorSetup('Bookings')],
    ['a mentor in review', viewers.mentorReview, explainer.mentorReview('Bookings')],
    ['a declined mentor', viewers.mentorDeclined, explainer.mentorNotApproved('Bookings')],
  ])('%s gets the explainer as the page, not the bookings', (_who, v, e) => {
    h.viewer = v;
    h.upcoming = remote([booking()]);
    render(<BookingsScreen />);
    expectLockedPage(e);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByText('School shortlist')).toBeNull();
  });

  it.each([
    ['a finished mentee', viewers.menteeFinished],
    ['an approved mentor', viewers.mentorApproved],
    ['an approved mentor who hasn’t seen the approved screen', viewers.mentorApprovedUnseen],
    ['a declined applicant who chose mentee (menteeByChoice)', viewers.menteeByChoice],
  ])('%s sees their bookings', (_who, v) => {
    h.viewer = v;
    render(<BookingsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Bookings' })).toBeInTheDocument();
    expectNoLock();
  });

  it('while /me loads: neither the bookings nor the explainer', () => {
    h.viewer = { kind: 'loading', signedIn: true };
    h.upcoming = remote<Booking[]>(null, { isLoading: true });
    render(<BookingsScreen />);
    expectNoLock();
    expect(screen.queryByText('School shortlist')).toBeNull();
  });

  it('a state whose page is switched off locks nothing (no button to a 404)', () => {
    flags.onboarding = false;
    flags.mentor = false;
    for (const v of [
      viewers.menteeUnfinished,
      viewers.mentorUnfinished,
      viewers.mentorReview,
      viewers.mentorDeclined,
    ]) {
      h.viewer = v;
      const { unmount } = render(<BookingsScreen />);
      expect(screen.getByRole('heading', { level: 1, name: 'Bookings' })).toBeInTheDocument();
      expectNoLock();
      unmount();
    }
  });
});
