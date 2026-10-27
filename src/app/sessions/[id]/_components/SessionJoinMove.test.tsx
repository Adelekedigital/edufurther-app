import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SessionType } from '@/types/mentor';
import {
  h,
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
// opens, where a move lands, and a refusal in the dialog. The call itself
// (one server-side move) is moveSession.test.tsx's.

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

  it('sends the session, the picked time and the message to the move', async () => {
    renderAt('2026-10-03T12:00:00Z');
    const { req } = await openAndMove();
    expect(req.booking.id).toBe('b1');
    expect(req.startsAt).toBe(NEW_TIME);
    expect(req.message).toBe(
      'Hi Amara, I can’t make our session on Sun, Oct 4. I’ve moved it to Tue, Oct 6 · 3:00 pm. See you then.',
    );
  });
});

describe('where the move ends', () => {
  it('moved: replaces this page with the new session’s, with no detour to Bookings', async () => {
    const view = renderAt('2026-10-03T12:00:00Z');
    const { onMoved } = await openAndMove();
    act(() => onMoved('b-new', true));
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
    act(() => moveHook.calls.at(-1)!.onMoved('b-new', false));
    expect(replace).toHaveBeenCalledWith('/bookings?booking=b-new');
  });

  it('moved, before the page lands: still Working…, never a bare Canceled card', async () => {
    const view = renderAt('2026-10-03T12:00:00Z');
    const { onMoved } = await openAndMove();
    // Moved: the refetched old row reads canceled before the page has gone.
    h.room = remote(menteeSession({ status: 'cancelled' }));
    act(() => onMoved('b-new', true));
    view.rerender(<SessionJoinScreen id="b1" />);
    expect(screen.getByRole('button', { name: 'Working…' })).toBeVisible();
    expect(screen.queryByText('Canceled')).not.toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeVisible();
  });

  it('while it runs and the old row turns canceled: the session as it was, not Canceled', async () => {
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

  it('refused: stays in the dialog, in the move’s words, and nothing has changed', async () => {
    moveHook.error = {
      kind: 'conflict',
      message: 'That time was just taken. Nothing has changed. Pick another time.',
    };
    renderAt('2026-10-03T12:00:00Z');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
      'That time was just taken. Nothing has changed. Pick another time.',
    );
    expect(screen.getByText('Upcoming')).toBeVisible();
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining('/bookings'));
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
