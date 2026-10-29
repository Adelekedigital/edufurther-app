import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingsScreen } from './BookingsScreen';
import {
  at,
  booking,
  h,
  hist,
  MEMBER,
  party,
  remote,
  resetHarness,
} from './bookingsScreen.harness';

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

vi.mock('@/lib/config/messages', () => ({ MESSAGES_LIVE: true }));
const opened: unknown[] = [];
vi.mock('@/app/_shell/SendMessageLauncher', () => ({
  SendMessageLauncher: ({ to }: { to: { id: string; firstName: string } | null }) => {
    if (to) opened.push(to);
    return to ? <div role="dialog" aria-label={`SendMessage to ${to.firstName}`} /> : null;
  },
}));

beforeEach(() => {
  resetHarness();
  opened.length = 0;
});
afterEach(() => vi.useRealTimers());

describe('Message buttons on Bookings (PRD Messages)', () => {
  const next = booking({ id: 'n1', startsAt: at(1), endsAt: at(2), other: party('Kemi Adebayo') });
  const later = booking({ id: 'l1', startsAt: at(30), endsAt: at(31) });

  it('the next session and each Later row open SendMessage for the other person', async () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.upcoming = remote([next, later]);
    render(<BookingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Send a message' }));
    expect(screen.getByRole('dialog', { name: 'SendMessage to Kemi' })).toBeInTheDocument();
    expect(opened.at(-1)).toMatchObject({ id: 'p1', role: 'mentee' });
    expect(screen.getByRole('button', { name: 'Message Amara' })).toBeVisible();
  });

  it('never on a request (B4)', () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.pending = remote([
      booking({ id: 'p1', status: 'pending', respondBy: at(5), startsAt: at(48), endsAt: at(49) }),
    ]);
    h.tab = 'pending';
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: /message/i })).not.toBeInTheDocument();
  });

  it('never to a deleted account', () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.upcoming = remote([
      booking({
        id: 'n1',
        startsAt: at(1),
        endsAt: at(2),
        other: { ...party('Deleted user'), deleted: true },
      }),
    ]);
    render(<BookingsScreen />);
    expect(screen.queryByRole('button', { name: /message/i })).not.toBeInTheDocument();
  });

  it('History: a mentor’s rows have Message; a mentee’s have none (Q13)', () => {
    h.viewer = { ...MEMBER, isMentor: true };
    h.history = hist({
      bookings: [
        booking({
          id: 'h1',
          status: 'completed',
          side: 'mentor',
          startsAt: at(-30),
          endsAt: at(-29),
        }),
        booking({
          id: 'h2',
          status: 'completed',
          side: 'mentee',
          startsAt: at(-50),
          endsAt: at(-49),
          other: party('Gbenga Ogundipe'),
        }),
      ],
    });
    h.tab = 'history';
    render(<BookingsScreen />);
    expect(screen.getByRole('button', { name: 'Message Amara' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Message Gbenga' })).not.toBeInTheDocument();
  });

  it('History: a mentee’s details panel still has "Send a message" (PRD Q13)', async () => {
    h.history = hist({
      bookings: [
        booking({
          id: 'h2',
          status: 'completed',
          side: 'mentee',
          startsAt: at(-50),
          endsAt: at(-49),
          other: party('Gbenga Ogundipe'),
        }),
      ],
    });
    h.tab = 'history';
    h.selectedBooking = 'h2';
    render(<BookingsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Send a message' }));
    expect(screen.getByRole('dialog', { name: 'SendMessage to Gbenga' })).toBeInTheDocument();
  });
});
