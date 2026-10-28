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
  reminders,
  resetHarness,
} from './bookingsScreen.harness';
import { launched, sent } from '@/app/_sessions/reviewAndRebook.harness';

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
vi.mock('@/lib/api/data/privateFiles', async () =>
  (await import('./bookingsScreen.harness')).mocks.privateFiles(),
);

beforeEach(resetHarness);
afterEach(() => vi.useRealTimers());

describe('the actions appear only where they can succeed', () => {
  const pendingRow = (over = {}) =>
    booking({
      id: 'p1',
      title: 'SOP review',
      status: 'pending',
      respondBy: at(5),
      startsAt: at(48),
      endsAt: at(49),
      ...over,
    });

  it('a mentor answers a request on the row itself', async () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.pending = remote([pendingRow({ side: 'mentor' })]);
    h.tab = 'pending';
    render(<BookingsScreen />);
    expect(screen.getByRole('button', { name: 'Accept' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeVisible();
  });

  it('accepting goes straight through — there is nothing to warn about', async () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.pending = remote([pendingRow({ side: 'mentor' })]);
    h.tab = 'pending';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(actions.accept!.mutate).toHaveBeenCalledWith(
      { bookingId: 'p1' },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('declining asks first, because it cannot be undone', async () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.pending = remote([pendingRow({ side: 'mentor' })]);
    h.tab = 'pending';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(screen.getByRole('dialog', { name: 'Decline this request?' })).toBeVisible();
    expect(actions.decline!.mutate).not.toHaveBeenCalled();
  });

  it('a mentee gets Cancel request on the row and in the panel, and no Accept anywhere', () => {
    h.pending = remote([pendingRow({ side: 'mentee' })]);
    h.tab = 'pending';
    h.selectedBooking = 'p1';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    // `pendingActions` visible: one on the row, one in the panel's footer.
    expect(screen.getAllByRole('button', { name: 'Cancel request' })).toHaveLength(2);
    expect(
      within(document.getElementById('booking-details')!).getByRole('button', {
        name: 'Cancel request',
      }),
    ).toBeVisible();
  });

  it('the row’s Cancel request asks first, in the withdraw dialog', async () => {
    h.pending = remote([pendingRow({ side: 'mentee' })]);
    h.tab = 'pending';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
    expect(screen.getByRole('dialog', { name: 'Withdraw this request?' })).toBeVisible();
    expect(screen.getByText('Your credit comes back.')).toBeVisible();
    expect(actions.withdraw!.mutate).not.toHaveBeenCalled();
  });

  describe('Send a reminder (under 24 hours left for the mentor)', () => {
    it('shows beside Cancel request only when the deadline is close', () => {
      h.pending = remote([
        pendingRow({ id: 'soon', side: 'mentee', respondBy: at(5) }),
        pendingRow({ id: 'later', side: 'mentee', respondBy: at(48) }),
      ]);
      h.tab = 'pending';
      render(<BookingsScreen />);
      expect(screen.getAllByRole('button', { name: 'Send a reminder' })).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: 'Cancel request' })).toHaveLength(2);
    });

    it('opens the dialog drafted, sends, then the row says Reminder sent (disabled)', async () => {
      h.pending = remote([pendingRow({ side: 'mentee', respondBy: at(5) })]);
      h.tab = 'pending';
      render(<BookingsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Send a reminder' }));
      expect(screen.getByRole('heading', { name: 'Send Amara a reminder?' })).toBeVisible();
      expect(
        (screen.getByRole('textbox', { name: 'Reminder message' }) as HTMLTextAreaElement).value,
      ).toMatch(/^Hi Amara, just checking in on my request for /);
      await userEvent.click(screen.getByRole('button', { name: 'Send reminder' }));
      expect(reminders.sent).toEqual([
        expect.objectContaining({ bookingId: 'p1', message: expect.stringMatching(/^Hi Amara/) }),
      ]);
      expect(screen.queryByRole('heading', { name: 'Send Amara a reminder?' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Reminder sent' })).toBeDisabled();
    });

    it('a reminder already on the session reads as sent, on the row and in the pill', () => {
      h.pending = remote([
        pendingRow({ side: 'mentee', respondBy: at(5), reminderSentAt: at(-1) }),
      ]);
      h.tab = 'pending';
      render(<BookingsScreen />);
      expect(screen.getByRole('button', { name: 'Reminder sent' })).toBeDisabled();
      expect(screen.getByText(/^Reminder sent · Amara has .* left to confirm$/)).toBeVisible();
    });

    it('a refusal keeps the dialog open with the text and says why', async () => {
      reminders.refuse = 'closed';
      h.pending = remote([pendingRow({ side: 'mentee', respondBy: at(5) })]);
      h.tab = 'pending';
      render(<BookingsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Send a reminder' }));
      await userEvent.click(screen.getByRole('button', { name: 'Send reminder' }));
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This request has closed, so the reminder can’t go.',
      );
      expect(screen.getByRole('heading', { name: 'Send Amara a reminder?' })).toBeVisible();
    });

    it('a reminder sent on one row stays sent when another row’s dialog opens', async () => {
      h.pending = remote([
        pendingRow({ id: 'a', side: 'mentee', respondBy: at(5) }),
        pendingRow({ id: 'b', side: 'mentee', respondBy: at(6), other: party('Kofi Mensah') }),
      ]);
      h.tab = 'pending';
      render(<BookingsScreen />);
      const [first] = screen.getAllByRole('button', { name: 'Send a reminder' });
      await userEvent.click(first!);
      await userEvent.click(screen.getByRole('button', { name: 'Send reminder' }));
      // The pill says so at once, before the list is refetched.
      expect(screen.getByText(/^Reminder sent · Amara has/)).toBeVisible();
      await userEvent.click(screen.getByRole('button', { name: 'Send a reminder' }));
      expect(screen.getByRole('heading', { name: 'Send Kofi a reminder?' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Reminder sent' })).toBeDisabled();
    });

    it('the open details panel says Reminder sent with the row, not after the refetch', async () => {
      h.pending = remote([pendingRow({ side: 'mentee', respondBy: at(5) })]);
      h.tab = 'pending';
      h.selectedBooking = 'p1';
      render(<BookingsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Send a reminder' }));
      await userEvent.click(screen.getByRole('button', { name: 'Send reminder' }));
      const panel = document.getElementById('booking-details')!;
      expect(within(panel).getByText(/^Reminder sent · Amara has/)).toBeVisible();
    });

    it('"already sent" (a lost response, or another tab) reads as sent, not refused', async () => {
      reminders.refuse = 'alreadySent';
      h.pending = remote([pendingRow({ side: 'mentee', respondBy: at(5) })]);
      h.tab = 'pending';
      render(<BookingsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Send a reminder' }));
      await userEvent.click(screen.getByRole('button', { name: 'Send reminder' }));
      expect(screen.queryByRole('heading', { name: 'Send Amara a reminder?' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Reminder sent' })).toBeDisabled();
    });

    it('the dialog closes if the request is answered while it is open', async () => {
      h.pending = remote([pendingRow({ side: 'mentee', respondBy: at(5) })]);
      h.tab = 'pending';
      const { rerender } = render(<BookingsScreen />);
      await userEvent.click(screen.getByRole('button', { name: 'Send a reminder' }));
      h.pending = remote([pendingRow({ side: 'mentee', status: 'confirmed', respondBy: at(5) })]);
      rerender(<BookingsScreen />);
      expect(screen.queryByRole('heading', { name: 'Send Amara a reminder?' })).toBeNull();
    });

    it('never on a mentor’s row', () => {
      h.viewer = { ...MEMBER, isMentor: true };
      h.pending = remote([pendingRow({ side: 'mentor', respondBy: at(5) })]);
      h.tab = 'pending';
      render(<BookingsScreen />);
      expect(screen.queryByRole('button', { name: /reminder/i })).toBeNull();
    });
  });

  it('a lapsed request of the mentee’s has no Cancel request: it is expiring', () => {
    h.pending = remote([pendingRow({ side: 'mentee', respondBy: at(-1) })]);
    h.tab = 'pending';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Cancel request' })).not.toBeInTheDocument();
  });

  it('a request awaiting an answer can be answered from the panel', async () => {
    // It said "Respond within 2 days" and offered nothing to respond with, and
    // on a phone the sheet covered the row's own buttons (UI review, PR 233).
    h.viewer = { ...MEMBER, isMentor: true };
    h.pending = remote([pendingRow({ side: 'mentor' })]);
    h.tab = 'pending';
    h.selectedBooking = 'p1';
    render(<BookingsScreen />);
    const panel = document.getElementById('booking-details')!;
    // "Accept request" in the panel, "Accept" in the row — the design's own
    // labels for the two places (`Bookings.dc.html`, the `d.pending` footer).
    expect(within(panel).getByRole('button', { name: 'Accept request' })).toBeVisible();
    expect(within(panel).getByRole('button', { name: 'Decline' })).toBeVisible();
    // And the row keeps its own pair: the owner's decision was both, not a
    // move. One builder fills them, so they cannot disagree.
    expect(screen.getByRole('button', { name: 'Accept' })).toBeVisible();
  });

  it('the overlap warning reaches the panel, where the Accept now is', () => {
    // Below 1100px the panel is a full-screen sheet, so a warning rendered only
    // in the row sits underneath it — and the mentor accepts a double booking
    // having read nothing (GitHub review, PR 233).
    h.viewer = { ...MEMBER, isMentor: true };
    h.upcoming = remote([booking({ id: 'clash', startsAt: at(30), endsAt: at(31) })]);
    h.pending = remote([
      booking({ id: 'p1', status: 'pending', respondBy: at(5), startsAt: at(30), endsAt: at(31) }),
    ]);
    h.tab = 'pending';
    h.selectedBooking = 'p1';
    render(<BookingsScreen />);
    const panel = document.getElementById('booking-details')!;
    expect(within(panel).getByText(/Accepting books both/)).toBeVisible();
  });

  it('and only once — the row does not keep a second copy of it', () => {
    // Above 1100px the panel is an aside and the row stays beside it, so both
    // copies were on the page at once: two live regions saying one thing, and
    // one `clash-<id>` between them (GitHub review, PR 233).
    h.viewer = { ...MEMBER, isMentor: true };
    h.upcoming = remote([booking({ id: 'clash', startsAt: at(30), endsAt: at(31) })]);
    h.pending = remote([
      booking({ id: 'p1', status: 'pending', respondBy: at(5), startsAt: at(30), endsAt: at(31) }),
    ]);
    h.tab = 'pending';
    h.selectedBooking = 'p1';
    render(<BookingsScreen />);
    expect(screen.getAllByText(/Accepting books both/)).toHaveLength(1);
    expect(document.querySelectorAll('#clash-p1')).toHaveLength(1);
  });

  it('declining from the panel still asks first', async () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.pending = remote([pendingRow({ side: 'mentor' })]);
    h.tab = 'pending';
    h.selectedBooking = 'p1';
    render(<BookingsScreen />);
    const panel = document.getElementById('booking-details')!;
    await userEvent.click(within(panel).getByRole('button', { name: 'Decline' }));
    expect(screen.getByRole('dialog', { name: 'Decline this request?' })).toBeVisible();
    expect(actions.decline!.mutate).not.toHaveBeenCalled();
  });

  it('and the panel offers nothing to answer once the deadline has passed', () => {
    // `canAccept` is the single opinion — the panel does not form its own.
    h.viewer = { ...MEMBER, isMentor: true };
    h.pending = remote([pendingRow({ side: 'mentor', respondBy: at(-1) })]);
    h.tab = 'pending';
    h.selectedBooking = 'p1';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });

  it('calling a session off from the panel asks first, like declining does', async () => {
    // The guarantee the move itself rests on. Wiring `onCallOff` straight to
    // the mutation would leave every other test in this file green, so this is
    // the one that holds it — the Decline equivalent is above.
    h.upcoming = remote([
      booking({ id: 'later', title: 'Later one', startsAt: at(48), endsAt: at(49) }),
    ]);
    h.selectedBooking = 'later';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel session' }));
    expect(screen.getByRole('dialog', { name: 'Cancel this booking?' })).toBeVisible();
    expect(actions.cancel!.mutate).not.toHaveBeenCalled();
  });

  it('and withdrawing from the panel asks too', async () => {
    h.pending = remote([pendingRow({ side: 'mentee' })]);
    h.tab = 'pending';
    h.selectedBooking = 'p1';
    render(<BookingsScreen />);
    await userEvent.click(
      within(document.getElementById('booking-details')!).getByRole('button', {
        name: 'Cancel request',
      }),
    );
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(actions.withdraw!.mutate).not.toHaveBeenCalled();
  });

  it('a lapsed request offers nothing — it is the backend’s to expire', async () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.pending = remote([pendingRow({ side: 'mentor', respondBy: at(-1) })]);
    h.tab = 'pending';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });

  it('a session inside ten minutes offers no Cancel', () => {
    h.upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'soon', title: 'Nearly now', startsAt: at(0.1), endsAt: at(1) }),
    ]);
    h.selectedBooking = 'soon';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Cancel session' })).not.toBeInTheDocument();
  });

  it('a session further out does', () => {
    h.upcoming = remote([
      booking({ id: 'a', title: 'Statement of Purpose' }),
      booking({ id: 'later', title: 'Later one', startsAt: at(48), endsAt: at(49) }),
    ]);
    h.selectedBooking = 'later';
    render(<BookingsScreen />);
    expect(screen.getByRole('button', { name: 'Cancel session' })).toBeVisible();
  });

  it('and never from the row itself, one tap from a scrolling list', () => {
    h.upcoming = remote([
      booking({ id: 'later', title: 'Later one', startsAt: at(48), endsAt: at(49) }),
    ]);
    render(<BookingsScreen />);
    expect(screen.getByRole('button', { name: /^Details for .*Later one/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Cancel session' })).not.toBeInTheDocument();
  });
});

describe('accepting a request that runs into another session', () => {
  it('warns before accepting, and says which session and when', () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.upcoming = remote([
      booking({ id: 'u1', title: 'Already booked', startsAt: at(10), endsAt: at(11) }),
    ]);
    h.pending = remote([
      booking({
        id: 'p1',
        title: 'Clashing request',
        status: 'pending',
        side: 'mentor',
        respondBy: at(5),
        startsAt: at(10.5),
        endsAt: at(11.5),
      }),
    ]);
    h.tab = 'pending';
    render(<BookingsScreen />);
    // On the row: the design's line, at the clashing session's start, in the
    // viewer's zone (22:00 UTC is 11:00 pm in Lagos), and Accept names it.
    const line = screen.getByText(/^Overlaps your 11:00 pm session with /);
    expect(line).toBeVisible();
    expect(screen.getByRole('button', { name: 'Accept' })).toHaveAttribute(
      'aria-describedby',
      line.id,
    );
    // The row no longer carries the Notice; the panel does.
    expect(screen.queryByText(/Accepting books both/)).not.toBeInTheDocument();
  });

  it('the panel keeps the Notice beside its Accept, for the phone sheet', () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.upcoming = remote([booking({ id: 'u1', startsAt: at(10), endsAt: at(11) })]);
    h.pending = remote([
      booking({
        id: 'p1',
        status: 'pending',
        side: 'mentor',
        respondBy: at(5),
        startsAt: at(10.5),
        endsAt: at(11.5),
      }),
    ]);
    h.tab = 'pending';
    h.selectedBooking = 'p1';
    render(<BookingsScreen />);
    const notice = screen.getByText(/This overlaps your session with/);
    expect(screen.getByText(/Accepting books both/)).toBeVisible();
    const accept = screen.getByRole('button', { name: 'Accept request' });
    expect(accept.getAttribute('aria-describedby')).toBe(notice.closest('[id]')?.id);
  });

  it('does not block it — accepting both may be the intention', async () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.upcoming = remote([booking({ id: 'u1', startsAt: at(10), endsAt: at(11) })]);
    h.pending = remote([
      booking({
        id: 'p1',
        status: 'pending',
        side: 'mentor',
        respondBy: at(5),
        startsAt: at(10.5),
        endsAt: at(11.5),
      }),
    ]);
    h.tab = 'pending';
    render(<BookingsScreen />);
    const accept = screen.getByRole('button', { name: 'Accept' });
    expect(accept).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(accept);
    expect(actions.accept!.mutate).toHaveBeenCalledWith(
      { bookingId: 'p1' },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('back-to-back sessions carry no warning', () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.upcoming = remote([booking({ id: 'u1', startsAt: at(9), endsAt: at(10) })]);
    h.pending = remote([
      booking({
        id: 'p1',
        status: 'pending',
        side: 'mentor',
        respondBy: at(5),
        startsAt: at(10),
        endsAt: at(11),
      }),
    ]);
    h.tab = 'pending';
    render(<BookingsScreen />);
    expect(screen.queryByText(/This overlaps your session with/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Overlaps your/)).not.toBeInTheDocument();
  });
});

describe('the review entry on History', () => {
  beforeEach(() => {
    // Book again and Leave a review are both gated on being able to book.
    h.viewer = { ...MEMBER, isMentor: false, isApprovedMentor: false, isMentee: true };
  });

  const completed = (over = {}) =>
    booking({
      id: 'h1',
      title: 'SOP review',
      status: 'completed',
      side: 'mentee',
      startsAt: at(-48),
      endsAt: at(-47),
      ...over,
    });

  const reviewable = (over = {}) => ({
    data: [{ id: 'h1', startsAt: at(-48), typeName: 'SOP review', ...over }],
    isLoading: false,
    error: null,
    retry: vi.fn(),
  });

  it('a reviewable session offers Leave a review and Book again together', () => {
    h.history = hist({ bookings: [completed()] });
    h.reviewable = reviewable();
    h.tab = 'history';
    render(<BookingsScreen />);
    expect(screen.getByRole('button', { name: 'Leave a review' })).toBeVisible();
    // Beside it until reviewed (founder, Oct 25): never a link to the profile.
    expect(screen.getByRole('button', { name: 'Book again' })).toBeVisible();
    expect(screen.queryByRole('link', { name: /Leave a review|Book again/ })).toBeNull();
  });

  it('Leave a review opens the review here, for this session', async () => {
    h.history = hist({ bookings: [completed()] });
    h.reviewable = reviewable();
    h.tab = 'history';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Leave a review' }));
    const dialog = screen.getByRole('dialog', { name: 'Review Amara' });
    expect(within(dialog).getByText('About h1')).toBeVisible();
  });

  it('once sent, the row turns to Book again alone', async () => {
    h.history = hist({ bookings: [completed()] });
    h.reviewable = reviewable();
    h.tab = 'history';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Leave a review' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send review' }));
    expect(sent).toEqual([
      expect.objectContaining({ mode: 'new', mentorId: 'p1', sessionId: 'h1' }),
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Close review' }));
    // The list is still catching up (it refetches); the page already knows.
    expect(screen.queryByRole('button', { name: 'Leave a review' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book again' })).toBeVisible();
  });

  it('Book again opens the booking modal here for that mentor', async () => {
    h.history = hist({ bookings: [completed()] });
    h.reviewable = reviewable();
    h.tab = 'history';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Book again' }));
    expect(screen.getByRole('dialog', { name: 'Book Amara Okafor' })).toBeVisible();
    expect(launched.at(-1)?.id).toBe('p1');
    expect(push).not.toHaveBeenCalled();
  });

  it('the review’s own Book again closes the review, then books', async () => {
    h.history = hist({ bookings: [completed()] });
    h.reviewable = reviewable();
    h.tab = 'history';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Leave a review' }));
    await userEvent.click(screen.getByRole('button', { name: 'Book again from the review' }));
    expect(screen.queryByRole('dialog', { name: 'Review Amara' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Book Amara Okafor' })).toBeVisible();
  });

  it('a session already reviewed (or inside the 30 days) offers Book again alone', () => {
    // The list drops a session once a review is written, so nothing here has to
    // re-derive eligibility — and nothing offers a second review.
    h.history = hist({ bookings: [completed()] });
    h.reviewable = { data: [], isLoading: false, error: null, retry: vi.fn() };
    h.tab = 'history';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Leave a review' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book again' })).toBeVisible();
  });

  it('no Book again for a mentor whose account is gone, nor on a canceled or missed row', () => {
    h.history = hist({
      bookings: [
        completed({ id: 'gone', other: { ...party('Deleted user'), deleted: true } }),
        completed({ id: 'c1', status: 'cancelled' }),
        completed({ id: 'm1', status: 'noShow' }),
      ],
    });
    h.reviewable = { data: [], isLoading: false, error: null, retry: vi.fn() };
    h.tab = 'history';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Book again' })).not.toBeInTheDocument();
  });

  it('a viewer who can’t book is offered no review, as on Session Join', () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.history = hist({ bookings: [completed()] });
    h.reviewable = reviewable();
    h.tab = 'history';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: /Leave a review|Book again/ })).toBeNull();
  });

  it('an open booking modal closes when the mentor’s account goes meanwhile', async () => {
    h.history = hist({ bookings: [completed()] });
    h.tab = 'history';
    const { rerender } = render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Book again' }));
    expect(screen.getByRole('dialog', { name: 'Book Amara Okafor' })).toBeVisible();
    h.history = hist({
      bookings: [completed({ other: { ...party('Deleted user'), deleted: true } })],
    });
    rerender(<BookingsScreen />);
    expect(screen.queryByRole('dialog', { name: /^Book / })).not.toBeInTheDocument();
  });

  it('and when the viewer turns out to be a mentor', async () => {
    h.history = hist({ bookings: [completed()] });
    h.tab = 'history';
    const { rerender } = render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Book again' }));
    h.viewer = { ...MEMBER, isMentor: true };
    rerender(<BookingsScreen />);
    expect(screen.queryByRole('dialog', { name: /^Book / })).not.toBeInTheDocument();
  });

  it('after a sent review, focus lands on the row’s Book again, not the page top', async () => {
    h.history = hist({ bookings: [completed()] });
    h.reviewable = reviewable();
    h.tab = 'history';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Leave a review' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send review' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close review' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Book again' })).toHaveFocus());
  });

  it('while reviewability is unknown, a completed row offers nothing', () => {
    h.history = hist({ bookings: [completed()] });
    h.reviewable = { data: null, isLoading: true, error: null, retry: vi.fn() };
    h.tab = 'history';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: /Leave a review|Book again/ })).toBeNull();
  });

  it('a mentor is never offered one — only mentees review', () => {
    h.history = hist({ bookings: [completed({ side: 'mentor' })] });
    h.reviewable = { data: [{ id: 'h1' }], isLoading: false, error: null, retry: vi.fn() };
    h.tab = 'history';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: 'Leave a review' })).not.toBeInTheDocument();
  });
});

describe('booking an offered time actually opens the flow', () => {
  const declined = () =>
    booking({
      id: 'd1',
      status: 'declined',
      side: 'mentee',
      startsAt: at(-48),
      endsAt: at(-47),
      sessionTypeId: 'st-general',
      suggestion: {
        id: 's1',
        startsAt: at(72),
        endsAt: at(73),
        durationMin: 60,
        heldUntil: at(1),
        status: 'active',
        bookedSessionId: null,
      },
    });

  it('names the offering as well as the time — `at` alone opens nothing', async () => {
    // The profile understands `?book=`; `?at=` on its own left the mentee on
    // the page with the flow closed and the held time unfound.
    push.mockReset();
    h.history = hist({ bookings: [declined()] });
    h.selectedBooking = 'd1';
    h.tab = 'history';
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Book / }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('book=st-general'));
    expect(push.mock.calls[0]![0]).toContain('at=');
  });

  it('offers nothing to press when the booking has no offering recorded', () => {
    h.history = hist({ bookings: [{ ...declined(), sessionTypeId: null }] });
    h.selectedBooking = 'd1';
    h.tab = 'history';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: /^Book / })).not.toBeInTheDocument();
  });
});
