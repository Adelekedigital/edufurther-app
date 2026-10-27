import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SessionType } from '@/types/mentor';
import {
  h,
  launched,
  MENTEE,
  moveHook,
  push,
  remote,
  replace,
  sessionRoom,
  setupSessionJoinHarness,
} from './sessionJoin.harness';
import { SessionJoinScreen } from './SessionJoinScreen';

// The mentee's move on Session Join (PRD fixes, fix 1): which dialog Cancel
// opens, where a move lands, and the notice when the cancel went through and
// the new time didn't. The sequence itself is moveSession.test.tsx's.

vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
vi.mock('next/navigation', async () => (await import('./sessionJoin.harness')).mocks.navigation());
vi.mock('@/lib/api/data/viewer', async () =>
  (await import('./sessionJoin.harness')).mocks.viewer(),
);
vi.mock('@/lib/api/data/sessionRoom', async () =>
  (await import('./sessionJoin.harness')).mocks.sessionRoom(),
);
vi.mock('@/lib/api/data/sessionAnswers', async () =>
  (await import('./sessionJoin.harness')).mocks.sessionAnswers(),
);
vi.mock('@/lib/api/data/bookingActions', async () =>
  (await import('./sessionJoin.harness')).mocks.bookingActions(),
);
vi.mock('@/lib/api/data/moveSession', async () =>
  (await import('./sessionJoin.harness')).mocks.moveSession(),
);
vi.mock('@/lib/api/data/booking', async (orig) =>
  (await import('./sessionJoin.harness')).mocks.booking(await orig()),
);
vi.mock('@/lib/api/data/reviewableSessions', async () =>
  (await import('./sessionJoin.harness')).mocks.reviewableSessions(),
);
vi.mock('@/lib/api/data/reviewWrite', async () =>
  (await import('./sessionJoin.harness')).mocks.reviewWrite(),
);
vi.mock('@/app/_reviews/ReviewDialog', async () =>
  (await import('./sessionJoin.harness')).mocks.reviewDialog(),
);
vi.mock('@/app/_shell/BookingLauncher/BookingLauncher', async () =>
  (await import('./sessionJoin.harness')).mocks.bookingLauncher(),
);
vi.mock('@/lib/api/data/intakeFiles', async () =>
  (await import('./sessionJoin.harness')).mocks.intakeFiles(),
);
vi.mock('@/lib/api/data/missedReason', async () =>
  (await import('./sessionJoin.harness')).mocks.missedReason(),
);

setupSessionJoinHarness();

const TYPE: SessionType = {
  id: 'st1',
  name: '1:1 call',
  durationMin: 30,
  description: '',
  windowDays: 30,
  requiresConfirmation: false,
  questions: [],
};
const NEW_TIME = '2026-10-06T14:00:00Z';

/** A mentee's confirmed session (6:00 pm Lagos, Oct 4), refundable until 12 hours before. */
function menteeSession(over: Partial<ReturnType<typeof sessionRoom>['booking']> = {}) {
  return sessionRoom({
    side: 'mentee',
    sessionTypeId: 'st1',
    refundUntil: '2026-10-04T05:00:00Z',
    ...over,
  });
}

function renderAt(iso: string) {
  vi.setSystemTime(new Date(iso));
  return render(<SessionJoinScreen id="b1" />);
}

beforeEach(() => {
  h.viewer = MENTEE;
  h.room = remote(menteeSession());
  h.types = [TYPE];
  h.slots = [NEW_TIME];
});

async function openAndMove() {
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await userEvent.click(screen.getByRole('radio', { name: 'Tue, Oct 6 · 3:00 pm' }));
  await userEvent.click(screen.getByRole('button', { name: 'Move session' }));
  return moveHook.calls.at(-1)!;
}

describe('Cancel on a mentee’s session', () => {
  it('29 hours out opens the move view, with the mentor’s open times', async () => {
    renderAt('2026-10-03T12:00:00Z');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog', { name: 'Move this session?' })).toBeVisible();
  });

  it('under 12 hours opens the cancel as built', async () => {
    renderAt('2026-10-04T08:00:00Z');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog', { name: 'Cancel this booking?' })).toBeVisible();
  });

  it('pressed before the types answer: a skeleton with no reasons to pick, then the move view', async () => {
    h.typesLoading = true;
    const view = renderAt('2026-10-03T12:00:00Z');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    // Nothing to touch that the move view would then cover (GitHub review, PR 431).
    expect(screen.getByLabelText('Getting your options ready')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByRole('button', { name: 'I no longer need it' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yes, cancel session' })).not.toBeInTheDocument();
    h.typesLoading = false;
    view.rerender(<SessionJoinScreen id="b1" />);
    expect(screen.getByRole('dialog', { name: 'Move this session?' })).toBeVisible();
  });

  it('pressed before the types answer, and the type is gone: then the cancel as built', async () => {
    h.typesLoading = true;
    h.types = [];
    const view = renderAt('2026-10-03T12:00:00Z');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    h.typesLoading = false;
    view.rerender(<SessionJoinScreen id="b1" />);
    expect(screen.getByRole('dialog', { name: 'Cancel this booking?' })).toBeVisible();
  });

  it('a session type the mentor no longer offers opens the cancel as built', async () => {
    h.types = [];
    renderAt('2026-10-03T12:00:00Z');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog', { name: 'Cancel this booking?' })).toBeVisible();
  });

  it('sends the session, its type, the picked time and the message to the move', async () => {
    renderAt('2026-10-03T12:00:00Z');
    const { req } = await openAndMove();
    expect(req.booking.id).toBe('b1');
    expect(req.sessionType.id).toBe('st1');
    expect(req.startsAt).toBe(NEW_TIME);
    expect(req.message).toBe(
      'Hi Amara, I can’t make our session on Sun, Oct 4. I’ve moved it to Tue, Oct 6 · 3:00 pm. See you then.',
    );
  });
});

describe('where the move ends', () => {
  it('moved: replaces this page with the new session’s, with no detour to Bookings', async () => {
    const view = renderAt('2026-10-03T12:00:00Z');
    const { cb } = await openAndMove();
    act(() => cb.onMoved('b-new', true));
    expect(replace).toHaveBeenCalledWith('/sessions/b-new');
    expect(push).not.toHaveBeenCalled();
    h.room = remote(menteeSession({ status: 'cancelled' }));
    view.rerender(<SessionJoinScreen id="b1" />);
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining('/bookings?booking=b1'));
  });

  it('moved as a request (approval on): straight to it in Bookings', async () => {
    h.types = [{ ...TYPE, requiresConfirmation: true }];
    renderAt('2026-10-03T12:00:00Z');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Tue, Oct 6 · 3:00 pm' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send request' }));
    act(() => moveHook.calls.at(-1)!.cb.onMoved('b-new', false));
    expect(replace).toHaveBeenCalledWith('/bookings?booking=b-new');
  });

  it('moved, before the page lands: still Working…, never a bare Canceled card', async () => {
    const view = renderAt('2026-10-03T12:00:00Z');
    const { cb } = await openAndMove();
    // The cancel has landed and the refetched row says so; the booking is made.
    h.room = remote(menteeSession({ status: 'cancelled' }));
    act(() => cb.onMoved('b-new', true));
    view.rerender(<SessionJoinScreen id="b1" />);
    expect(screen.getByRole('button', { name: 'Working…' })).toBeVisible();
    expect(screen.queryByText('Canceled')).not.toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeVisible();
  });

  it('while it runs and the cancel lands: the session as it was, not Canceled', async () => {
    const view = renderAt('2026-10-03T12:00:00Z');
    await openAndMove();
    moveHook.isPending = true;
    h.room = remote(menteeSession({ status: 'cancelled' }));
    view.rerender(<SessionJoinScreen id="b1" />);
    expect(screen.queryByText('Canceled')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Move this session?' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Working…' })).toBeVisible();
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining('/bookings'));
  });

  it('told some answers won’t carry over: the next press moves it anyway', async () => {
    moveHook.error = {
      stage: 'prepare',
      reason: 'answersDropped',
      error: { kind: 'validation', message: '' },
    };
    renderAt('2026-10-03T12:00:00Z');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
      'Some of your answers won’t carry over, because Amara changed the questions. Nothing has changed yet. Press Move session again to move it anyway.',
    );
    const { req } = await (async () => {
      await userEvent.click(screen.getByRole('radio', { name: 'Tue, Oct 6 · 3:00 pm' }));
      await userEvent.click(screen.getByRole('button', { name: 'Move session' }));
      return moveHook.calls.at(-1)!;
    })();
    expect(req.acceptDropped).toBe(true);
  });

  it('a failure before the cancel stays in the dialog, in its words', async () => {
    moveHook.error = {
      stage: 'prepare',
      reason: 'failed',
      error: { kind: 'server', message: 'x' },
    };
    renderAt('2026-10-03T12:00:00Z');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
      'We couldn’t get your session ready to move. Nothing has changed. Try again in a moment.',
    );
  });

  it.each([
    [
      'upload',
      'You have too many files waiting to be used in a booking. Try again tomorrow. Nothing has changed.',
    ],
    [
      'fileUnavailable',
      'Your file for this session is no longer available, so we can’t move it. Nothing has changed.',
    ],
    [
      'sessionChanged',
      'Amara changed this session since you opened it. Nothing has changed. Close this and try again.',
    ],
    ['slotTaken', 'That time was just taken. Nothing has changed. Pick another time.'],
  ] as const)(
    'stopped before the cancel (%s): says so, and that nothing changed',
    async (reason, text) => {
      moveHook.error = {
        stage: 'prepare',
        reason,
        error: {
          kind: 'conflict',
          message: 'You have too many files waiting to be used in a booking. Try again tomorrow.',
        },
      };
      renderAt('2026-10-03T12:00:00Z');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(text);
    },
  );

  it('the questions changed: says so, and points at the cancel', async () => {
    moveHook.error = {
      stage: 'prepare',
      reason: 'questionsChanged',
      error: { kind: 'validation', message: '' },
    };
    renderAt('2026-10-03T12:00:00Z');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
      'Amara’s questions for this session have changed, so we can’t move it.',
    );
  });

  it('booked failed after the cancel: the dialog closes, the page stays with the notice and Book again', async () => {
    const view = renderAt('2026-10-03T12:00:00Z');
    const { cb } = await openAndMove();
    // The cancel has landed: the row is canceled now.
    h.room = remote(menteeSession({ status: 'cancelled' }));
    act(() => cb.onBookFailed({ why: 'other', error: { kind: 'server', message: 'x' } }));
    view.rerender(<SessionJoinScreen id="b1" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining('/bookings'));
    expect(screen.getAllByText('Canceled').length).toBeGreaterThan(0);
    expect(screen.getByText('We couldn’t book your new time')).toBeVisible();
    expect(
      screen.getByText(
        'Your session on Sun, Oct 4 is canceled and your credit is back. Pick another time to book again.',
      ),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Book Amara again' }));
    expect(launched.at(-1)).toMatchObject({ id: 'amara' });
  });

  it('book failed before the refetched row says canceled: canceled already, never upcoming', async () => {
    renderAt('2026-10-03T12:00:00Z');
    const { cb } = await openAndMove();
    act(() => cb.onBookFailed({ why: 'taken', error: { kind: 'conflict', message: 'x' } }));
    expect(screen.queryByText('Upcoming')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.getByText('We couldn’t book your new time')).toBeVisible();
  });

  it.each([
    ['taken', 'That time was just taken. Your session on Sun, Oct 4 is canceled'],
    [
      'questions',
      'Amara’s questions for this session changed. Your session on Sun, Oct 4 is canceled',
    ],
  ] as const)('the notice says why the booking failed (%s), and takes focus', async (why, text) => {
    renderAt('2026-10-03T12:00:00Z');
    const { cb } = await openAndMove();
    act(() => cb.onBookFailed({ why, error: { kind: 'conflict', message: 'x' } }));
    const notice = screen.getByText('We couldn’t book your new time').parentElement!.parentElement!;
    expect(notice).toHaveTextContent(text);
    // The explanation itself, so a screen reader lands on what happened.
    await vi.waitFor(() => expect(notice).toHaveFocus());
  });

  it('a canceled session with no move in flight still goes to Bookings, as built', () => {
    h.room = remote(menteeSession({ status: 'cancelled' }));
    renderAt('2026-10-03T12:00:00Z');
    expect(replace).toHaveBeenCalledWith('/bookings?booking=b1');
  });
});

describe('the "If plans change" tip', () => {
  const tip = (text: string) =>
    within(screen.getByRole('complementary', { name: 'Getting ready' })).getByText(text);

  it('mentor, with the row’s window', () => {
    h.viewer = { ...MENTEE, isMentor: true, isApprovedMentor: true, isMentee: false };
    h.room = remote(menteeSession({ side: 'mentor' }));
    renderAt('2026-10-03T12:00:00Z');
    expect(
      tip('Canceling at least 12 hours before lets someone else book the time.'),
    ).toBeVisible();
  });

  it('mentee, with no window on the row: no number', () => {
    h.room = remote(menteeSession({ refundUntil: null }));
    renderAt('2026-10-03T12:00:00Z');
    expect(
      tip(
        'Need another time? Use Cancel. Moving it in good time lets someone else book this time.',
      ),
    ).toBeVisible();
  });
});
