import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Booking } from '@/types/booking';
import type { SessionType } from '@/types/mentor';
import { moveHook, sessionTypes } from '@/app/_sessions/cancelMove.harness';
import { BookingsScreen } from './BookingsScreen';
import {
  actions,
  at,
  booking,
  h,
  MEMBER,
  push,
  remote,
  replace,
  resetHarness,
} from './bookingsScreen.harness';

// Cancel from Bookings offers the same move as Session Join (one hook,
// useCancelMove): which cancels get it, and where a move from here lands.

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
vi.mock('@/lib/api/data/booking', async (orig) =>
  (await import('./bookingsScreen.harness')).mocks.booking(await orig()),
);
vi.mock('@/lib/api/data/moveSession', async () =>
  (await import('./bookingsScreen.harness')).mocks.moveSession(),
);
vi.mock('@/lib/api/data/privateFiles', async () =>
  (await import('./bookingsScreen.harness')).mocks.privateFiles(),
);

const MENTEE = { ...MEMBER, isMentee: true, isMentor: false, isApprovedMentor: false };
const TYPE: SessionType = {
  id: 'st1',
  name: '1:1 call',
  durationMin: 60,
  description: '',
  windowDays: 30,
  requiresConfirmation: false,
  questions: [],
};
/** Tue, Oct 6 · 3:00 pm in Lagos. */
const NEW_TIME = '2026-10-06T14:00:00Z';

/** The mentee's confirmed session two days out, refundable until 12 hours before. */
const session = (over = {}) =>
  booking({
    id: 'later',
    side: 'mentee',
    title: 'Later one',
    startsAt: at(48),
    endsAt: at(49),
    refundUntil: at(36),
    ...over,
  });

beforeEach(() => {
  resetHarness();
  h.viewer = MENTEE;
  h.upcoming = remote([session()]);
  h.selectedBooking = 'later';
  sessionTypes.data = [TYPE];
  h.slots = [NEW_TIME];
});
afterEach(() => vi.useRealTimers());

const panel = () => within(document.getElementById('booking-details')!);

async function openAndMove(confirm = 'Move session') {
  await userEvent.click(panel().getByRole('button', { name: 'Cancel session' }));
  await userEvent.click(screen.getByRole('radio', { name: 'Tue, Oct 6 · 3:00 pm' }));
  await userEvent.click(screen.getByRole('button', { name: confirm }));
  return moveHook.calls.at(-1)!;
}

describe('which cancels offer the move', () => {
  it('a mentee cancelling a confirmed session gets Move this session?, as on Session Join', async () => {
    render(<BookingsScreen />);
    await userEvent.click(panel().getByRole('button', { name: 'Cancel session' }));
    expect(screen.getByRole('dialog', { name: 'Move this session?' })).toBeVisible();
    expect(screen.getByRole('switch', { name: 'Book a new time with Amara' })).toBeChecked();
  });

  it('switched off, it is the cancel as built', async () => {
    render(<BookingsScreen />);
    await userEvent.click(panel().getByRole('button', { name: 'Cancel session' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Book a new time with Amara' }));
    expect(screen.getByRole('dialog', { name: 'Cancel this booking?' })).toBeVisible();
  });

  it('inside the refund window: the cancel as built', async () => {
    h.upcoming = remote([session({ refundUntil: at(-1) })]);
    render(<BookingsScreen />);
    await userEvent.click(panel().getByRole('button', { name: 'Cancel session' }));
    expect(screen.getByRole('dialog', { name: 'Cancel this booking?' })).toBeVisible();
    expect(screen.queryByRole('switch', { name: /Book a new time/ })).not.toBeInTheDocument();
  });

  it('a mentor cancelling: the cancel as built, with no move', async () => {
    h.viewer = MEMBER;
    h.upcoming = remote([session({ side: 'mentor' })]);
    render(<BookingsScreen />);
    await userEvent.click(panel().getByRole('button', { name: 'Cancel session' }));
    expect(screen.getByRole('dialog', { name: 'Cancel this booking?' })).toBeVisible();
    expect(screen.queryByRole('switch', { name: /Book a new time/ })).not.toBeInTheDocument();
  });

  it('a mentee withdrawing a request: the withdraw dialog, with no move', async () => {
    h.upcoming = remote([]);
    h.pending = remote([
      session({ id: 'p1', status: 'pending', respondBy: at(5), refundUntil: null }),
    ]);
    h.tab = 'pending';
    h.selectedBooking = 'p1';
    render(<BookingsScreen />);
    await userEvent.click(panel().getByRole('button', { name: 'Cancel request' }));
    expect(screen.getByRole('dialog', { name: 'Withdraw this request?' })).toBeVisible();
    expect(screen.queryByRole('switch', { name: /Book a new time/ })).not.toBeInTheDocument();
  });
});

describe('where a move from Bookings lands', () => {
  it('sends the session, the picked time and the drafted message', async () => {
    render(<BookingsScreen />);
    const { req } = await openAndMove();
    expect(req.booking.id).toBe('later');
    expect(req.startsAt).toBe(NEW_TIME);
    expect(req.message).toContain('Tue, Oct 6 · 3:00 pm');
    expect(actions.cancel!.mutate).not.toHaveBeenCalled();
  });

  it('confirmed: to the new session’s page, and the dialog goes with it', async () => {
    render(<BookingsScreen />);
    const { onMoved } = await openAndMove();
    act(() => onMoved('b-new', true));
    expect(push).toHaveBeenCalledWith('/sessions/b-new');
    // Back restores the screen from the router cache: never on "Working…".
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('back on Bookings after a confirmed move, the next Cancel opens clean', async () => {
    render(<BookingsScreen />);
    const { onMoved } = await openAndMove();
    act(() => onMoved('b-new', true));
    await userEvent.click(panel().getByRole('button', { name: 'Cancel session' }));
    expect(screen.getByRole('dialog', { name: 'Move this session?' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Working…' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move session' })).toBeVisible();
  });

  it('and a remount after it opens clean too', async () => {
    const view = render(<BookingsScreen />);
    const { onMoved } = await openAndMove();
    act(() => onMoved('b-new', true));
    view.unmount();
    render(<BookingsScreen />);
    await userEvent.click(panel().getByRole('button', { name: 'Cancel session' }));
    expect(screen.getByRole('button', { name: 'Move session' })).toBeVisible();
  });

  it('a request (approval on): stays on Bookings and opens it on Pending', async () => {
    sessionTypes.data = [{ ...TYPE, requiresConfirmation: true }];
    render(<BookingsScreen />);
    const { onMoved } = await openAndMove('Send request');
    act(() => onMoved('b-new', false));
    expect(replace).toHaveBeenCalledWith('/bookings?tab=pending&booking=b-new', {
      scroll: false,
    });
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Request sent to Amara. It’s on Pending now.')).toBeInTheDocument();
  });

  it.each([
    ['beside the list', false],
    ['in the phone sheet', true],
  ])(
    'a request: once the panel has swapped to it, focus lands on it (%s), not the page body',
    async (_where, narrow) => {
      h.narrow = narrow;
      sessionTypes.data = [{ ...TYPE, requiresConfirmation: true }];
      const view = render(<BookingsScreen />);
      const { onMoved } = await openAndMove('Send request');
      act(() => onMoved('b-new', false));
      // The replace lands: Pending, the new request still loading, so the
      // panel's old controls (the dialog's opener) are gone.
      h.tab = 'pending';
      h.selectedBooking = 'b-new';
      h.pending = remote<Booking[]>(null, { isLoading: true });
      view.rerender(<BookingsScreen />);
      // Then it arrives.
      h.pending = remote([
        session({ id: 'b-new', status: 'pending', respondBy: at(20), refundUntil: null }),
      ]);
      view.rerender(<BookingsScreen />);
      await waitFor(() => {
        expect(document.activeElement).not.toBe(document.body);
        expect(document.getElementById('booking-details')).toContainElement(
          document.activeElement as HTMLElement,
        );
      });
    },
  );

  it('refused: stays in the dialog, in the move’s words, and nothing has changed', async () => {
    moveHook.error = {
      kind: 'conflict',
      message: 'That time was just taken. Nothing has changed. Pick another time.',
    };
    render(<BookingsScreen />);
    await userEvent.click(panel().getByRole('button', { name: 'Cancel session' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
      'That time was just taken. Nothing has changed. Pick another time.',
    );
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
