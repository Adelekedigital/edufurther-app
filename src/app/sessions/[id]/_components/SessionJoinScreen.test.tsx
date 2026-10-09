import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api/data/errors';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { BookingAnswer, SessionRoom } from '@/types/booking';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import { SessionJoinScreen } from './SessionJoinScreen';

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/sessions/b1',
  useRouter: () => ({ replace, push }),
  useSearchParams: () => new URLSearchParams(),
}));

let viewer: Viewer;
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => viewer }));

let room: Remote<SessionRoom>;
vi.mock('@/lib/api/data/sessionRoom', () => ({ useSessionRoom: () => room }));

let answers: Remote<BookingAnswer[]>;
vi.mock('@/lib/api/data/sessionAnswers', () => ({ useBookingAnswers: () => answers }));

const join = vi.fn();
const door = vi.fn();
vi.mock('@/lib/api/data/bookings', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useJoinSession: () => ({ mutate: join, isPending: false }),
  useSessionDoor: () => ({ mutate: door, isPending: false }),
}));

const cancel = { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null };
vi.mock('@/lib/api/data/bookingActions', () => ({ useBookingAction: () => cancel }));
vi.mock('@/lib/api/data/booking', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useSlots: () => ({ data: [], isLoading: false, error: null, retry: vi.fn() }),
}));
// Whether this session can still be reviewed (the list Bookings reads too).
let reviewables: Remote<{ id: string; startsAt: string; typeName: string | null }[]>;
vi.mock('@/lib/api/data/reviewableSessions', () => ({
  useMyReviewableSessions: () => reviewables,
}));
// The send hook keeps real state, so "sent" re-renders as the real one does.
const sent: unknown[] = [];
vi.mock('@/lib/api/data/reviewWrite', async () => {
  const { useState } = await import('react');
  return {
    useSendReview: () => {
      const [result, setResult] = useState<{ editableUntil: string | null } | null>(null);
      return {
        send: (input: unknown) => {
          sent.push(input);
          setResult({ editableUntil: null });
        },
        isPending: false,
        result,
        error: null,
        reset: () => setResult(null),
      };
    },
  };
});
// The review modal is ReviewFlow's (tested on its own); here, only its wiring.
vi.mock('@/app/_reviews/ReviewDialog', () => ({
  ReviewDialog: (p: {
    mentorFirstName: string;
    sessions: { id: string }[];
    done: boolean;
    onSend: (a: unknown, id: string | null) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label={`Review ${p.mentorFirstName}`}>
      <span>{p.done ? 'Sent' : `About ${p.sessions.map((x) => x.id).join(',')}`}</span>
      <button type="button" onClick={() => p.onSend({ overall: 5 }, p.sessions[0]!.id)}>
        Send review
      </button>
      <button type="button" onClick={p.onClose}>
        Close review
      </button>
    </div>
  ),
}));
vi.mock('@/lib/api/data/intakeFiles', () => ({
  useIntakeFile: () => ({ url: 'blob:stub', isLoading: false, error: null, retry: vi.fn() }),
  canPreview: () => true,
}));

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
  bookingCounts: { pending: 0, upcoming: 1 },
};

const MENTEE: Extract<Viewer, { kind: 'member' }> = {
  ...MEMBER,
  isMentee: true,
  isApprovedMentor: false,
  isMentor: false,
};

// A 30-minute call at 6:00 pm Lagos (17:00 UTC); the window is 16:55–17:15.
const START = '2026-10-04T17:00:00Z';
const at = (hhmmss: string) => new Date(`2026-10-04T${hhmmss}Z`);

function sessionRoom(
  over: Partial<SessionRoom['booking']> = {},
  me = {},
  provider: SessionRoom['provider'] = 'daily',
): SessionRoom {
  return {
    booking: sampleBookingFor({
      side: 'mentor',
      other: sampleParty({ id: 'amara', name: 'Amara Okafor', firstName: 'Amara' }),
      startsAt: START,
      endsAt: '2026-10-04T17:30:00Z',
      durationMin: 30,
      joinOpensAt: '2026-10-04T16:55:00Z',
      joinClosesAt: '2026-10-04T17:15:00Z',
      doorClosesAt: '2026-10-04T17:30:00Z',
      ...over,
    }),
    me: sampleParty({ id: 'me', name: 'Gbenga Ogundipe', firstName: 'Gbenga', ...me }),
    typeName: '1:1 call',
    provider,
  };
}

const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

const answer = (text: string): BookingAnswer => ({
  questionId: text,
  question: 'What would you like to talk about?',
  kind: 'free_text',
  retired: false,
  text,
  file: null,
});

function renderAt(time: string) {
  vi.setSystemTime(at(time));
  return render(<SessionJoinScreen id="b1" />);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  viewer = MEMBER;
  room = remote(sessionRoom());
  answers = remote<BookingAnswer[]>([]);
  join.mockReset();
  sent.length = 0;
  reviewables = remote([{ id: 'b1', startsAt: START, typeName: '1:1 call' }]);
  door.mockReset();
  replace.mockReset();
  cancel.mutate.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('the frame', () => {
  it('has no nav rail, and its one way back goes to Bookings', () => {
    renderAt('15:15:00');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Bookings' })).toHaveAttribute(
      'href',
      '/bookings',
    );
  });

  it('a guest is asked to log in, and comes back here after', () => {
    viewer = { kind: 'guest' };
    room = remote<SessionRoom>(null);
    renderAt('15:15:00');
    expect(screen.getByText('Log in to join your session')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fsessions%2Fb1',
    );
  });
});

describe('the login return path', () => {
  it('keeps an id with slashes and dots inside its own path segment', () => {
    viewer = { kind: 'guest' };
    room = remote<SessionRoom>(null);
    vi.setSystemTime(at('15:15:00'));
    render(<SessionJoinScreen id="x/../admin" />);
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent('/sessions/x%2F..%2Fadmin')}`,
    );
  });
});

describe('the four states', () => {
  it('loading is the lobby’s shape, busy, and says nothing has failed', () => {
    room = remote<SessionRoom>(null, { isLoading: true });
    renderAt('15:15:00');
    expect(screen.getByLabelText('Loading your session')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(/couldn’t/)).not.toBeInTheDocument();
  });

  it('a failed read offers a retry, never "not found"', async () => {
    const retry = vi.fn();
    room = remote<SessionRoom>(null, { error: { status: 500 } as AppError, retry });
    renderAt('15:15:00');
    expect(screen.getByText('We couldn’t load this session')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it.each([403, 404, 422])('a %s reads as not available, with the way back', (status) => {
    room = remote<SessionRoom>(null, { error: { status } as AppError });
    renderAt('15:15:00');
    expect(screen.getByText('This session isn’t available')).toBeVisible();
  });

  it('a failed refetch keeps the session on screen', () => {
    room = remote(sessionRoom(), { error: { status: 500 } as AppError });
    renderAt('15:15:00');
    expect(screen.getByRole('heading', { name: '1:1 call with Amara Okafor' })).toBeVisible();
  });

  it.each(['cancelled', 'pending'] as const)(
    'a %s session is handed to Bookings, replacing this entry',
    (status) => {
      room = remote(sessionRoom({ status }));
      renderAt('15:15:00');
      expect(replace).toHaveBeenCalledWith('/bookings?booking=b1');
    },
  );

  it.each(['completed', 'noShow'] as const)(
    'a %s session stays here once it has ended',
    (status) => {
      room = remote(sessionRoom({ status }));
      renderAt('17:31:00');
      expect(replace).not.toHaveBeenCalled();
    },
  );
});

describe('completed', () => {
  const completed = (side: 'mentee' | 'mentor') =>
    remote({
      ...sessionRoom({
        status: 'completed',
        side,
        myAttendance: 'attended',
        other: sampleParty({ id: 'amara', firstName: 'Amara', attendance: 'attended' }),
      }),
    });

  it('stops the page clock once the outcome is final', () => {
    viewer = MENTEE;
    room = completed('mentee');
    const every = vi.spyOn(window, 'setInterval');
    renderAt('17:40:00');
    expect(every.mock.calls.some(([, ms]) => ms === 1000)).toBe(false);
    every.mockRestore();
  });

  it('keeps the clock while a session is still ahead', () => {
    const every = vi.spyOn(window, 'setInterval');
    renderAt('15:15:00');
    expect(every.mock.calls.some(([, ms]) => ms === 1000)).toBe(true);
    every.mockRestore();
  });

  it('shows both people as joined, with no clock and no Join', () => {
    viewer = MENTEE;
    room = completed('mentee');
    renderAt('17:40:00');
    expect(screen.getByText('Completed')).toBeVisible();
    expect(screen.getAllByText('Joined')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /join/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Quick guide for a rewarding session')).not.toBeInTheDocument();
  });

  it('a mentee reviews here, in the review modal, and is thanked on the page', async () => {
    viewer = MENTEE;
    room = completed('mentee');
    renderAt('17:40:00');
    expect(screen.getByText('How was your session with Amara?')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Book again' })).toHaveAttribute(
      'href',
      '/mentors/amara',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Leave a review' }));
    const dialog = screen.getByRole('dialog', { name: 'Review Amara' });
    expect(within(dialog).getByText('About b1')).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send review' }));
    expect(sent).toEqual([
      { mode: 'new', mentorId: 'amara', sessionId: 'b1', answers: { overall: 5 } },
    ]);
    // The list refreshes without this session; the modal stays for its thanks step.
    reviewables = remote([]);
    expect(within(dialog).getByText('Sent')).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close review' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Thanks, your review is on Amara’s profile.')).toBeVisible();
    // Leave a review is gone; focus is on the thanks line, not <body>.
    expect(
      screen.getByText('Thanks, your review is on Amara’s profile.').parentElement,
    ).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Leave a review' })).not.toBeInTheDocument();
  });

  it('offers neither review nor Book again while it is unknown whether it can be reviewed', () => {
    viewer = MENTEE;
    room = completed('mentee');
    reviewables = remote<{ id: string; startsAt: string; typeName: string | null }[]>(null, {
      isLoading: true,
    });
    renderAt('17:40:00');
    expect(screen.getByText('How was your session with Amara?')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Leave a review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Book again' })).not.toBeInTheDocument();
  });

  it('a failed reviewability check says so, retries, and keeps Book again', async () => {
    viewer = MENTEE;
    room = completed('mentee');
    const retry = vi.fn();
    reviewables = remote<{ id: string; startsAt: string; typeName: string | null }[]>(null, {
      error: { status: 500 } as AppError,
      retry,
    });
    renderAt('17:40:00');
    expect(
      screen.getByText('We couldn’t check whether you can review this session.'),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Book again' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('a mentor gets no review prompt and no booking', () => {
    room = completed('mentor');
    renderAt('17:40:00');
    expect(screen.getByText('Nice work. Session complete.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Leave a review' })).not.toBeInTheDocument();
    // The header's way back, and the outcome's own action.
    expect(screen.getAllByRole('link', { name: 'Go to Bookings' })).toHaveLength(2);
  });
});

describe('a Join notice belongs to joining', () => {
  it('is gone once the session has settled', async () => {
    room = remote(sessionRoom({}, {}));
    join.mockImplementation((_id, { onError }) => onError(new ApiError(409)));
    const view = renderAt('17:10:00');
    await userEvent.click(screen.getByRole('button', { name: 'Join now' }));
    expect(
      screen.getByText('This session isn’t open to join right now.', {
        selector: 'p:not(.sr-only)',
      }),
    ).toBeVisible();
    room = remote(sessionRoom({ status: 'completed' }));
    vi.setSystemTime(at('17:40:00'));
    view.rerender(<SessionJoinScreen id="b1" />);
    // The page's own clock moves on its next tick.
    act(() => void vi.advanceTimersByTime(1000));
    expect(
      screen.queryByText('This session isn’t open to join right now.', {
        selector: 'p:not(.sr-only)',
      }),
    ).not.toBeInTheDocument();
  });
});

describe('missed', () => {
  const missedRoom = (
    side: 'mentee' | 'mentor',
    mine: 'attended' | 'noShow',
    theirs: 'attended' | 'noShow',
  ) =>
    remote(
      sessionRoom({
        status: 'noShow',
        side,
        myAttendance: mine,
        other: sampleParty({ id: 'amara', firstName: 'Amara', attendance: theirs }),
      }),
    );

  it('the mentor missed a mentee’s session: their credit is back, with ways to rebook', () => {
    viewer = MENTEE;
    room = missedRoom('mentee', 'attended', 'noShow');
    renderAt('17:40:00');
    expect(screen.getByText('Missed')).toBeVisible();
    expect(screen.getByText('Didn’t join')).toBeVisible();
    expect(screen.getByText('Amara didn’t join. Your credit is back.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Rebook with Amara' })).toHaveAttribute(
      'href',
      '/mentors/amara',
    );
    expect(screen.getByRole('link', { name: 'Find another mentor' })).toHaveAttribute(
      'href',
      '/explore',
    );
  });

  it('the viewer missed it: said plainly, never claiming how long anyone waited', () => {
    viewer = MENTEE;
    room = missedRoom('mentee', 'noShow', 'attended');
    renderAt('17:40:00');
    expect(screen.getByText('You missed this session')).toBeVisible();
    expect(screen.queryByText(/waited/)).not.toBeInTheDocument();
  });
});

describe('before the window', () => {
  it('names the session, the day, the time, whose clock, and the venue', () => {
    renderAt('15:15:00');
    expect(
      screen.getByRole('heading', { level: 1, name: '1:1 call with Amara Okafor' }),
    ).toBeVisible();
    expect(
      screen.getByText('Sun, Oct 4 · 6:00 – 6:30 pm · Lagos (WAT) · EduFurther video'),
    ).toBeVisible();
    expect(screen.getByText('Upcoming')).toBeVisible();
  });

  it('counts down, and Join stays locked with when it opens', () => {
    renderAt('15:15:00');
    expect(screen.getByText('1:45:00')).toBeVisible();
    // Under the clock and on the button, as the design draws both.
    expect(screen.getAllByText('Join opens in 1:40:00')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Join opens in 1:40:00' })).toBeDisabled();
    expect(screen.getByText('The button turns on 5 minutes before the start.')).toBeVisible();
  });

  it('shows both people, neither in the call', () => {
    renderAt('15:15:00');
    expect(screen.getByText('You')).toBeVisible();
    expect(screen.getByText('Not in the call')).toBeVisible();
    expect(screen.getByText('Amara')).toBeVisible();
    expect(screen.getByText('Not here yet')).toBeVisible();
  });

  it('offers Cancel, and confirms it before calling the session off', async () => {
    renderAt('15:15:00');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel this session' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel session' }));
    expect(cancel.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'b1' }),
      expect.anything(),
    );
  });

  it('offers Add to calendar for the session’s own page, never the call link', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderAt('15:15:00');
    await userEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Google Calendar/ }));
    const url = new URL(String(open.mock.calls[0]![0]));
    expect(url.searchParams.get('text')).toBe('1:1 call with Amara Okafor');
    expect(url.searchParams.get('details')).toContain('/sessions/b1');
    open.mockRestore();
  });

  it('no Cancel within ten minutes of the start: the backend refuses it', () => {
    renderAt('16:51:00');
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});

describe('the window is open', () => {
  it('Join is pressable with the venue’s hint, on a blue ground', () => {
    renderAt('16:56:00');
    expect(screen.getByText('Starting soon')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Join session' })).toBeEnabled();
    expect(screen.getByText('Opens in your browser. No download needed.')).toBeVisible();
    expect(screen.getByText('Ready when you are')).toBeVisible();
  });

  it('EduFurther video: Joined once Daily has seen them in the room, never "Here now"', () => {
    room = remote(
      sessionRoom({
        other: sampleParty({
          firstName: 'Amara',
          joinedAt: '2026-10-04T16:57:00Z',
          inRoomAt: '2026-10-04T16:57:20Z',
        }),
      }),
    );
    renderAt('16:58:00');
    expect(screen.getByText('Joined')).toBeVisible();
    expect(screen.queryByText('Here now')).not.toBeInTheDocument();
  });

  it('EduFurther video: pressed Join but not seen in the room reads Joining…', () => {
    room = remote(
      sessionRoom({ other: sampleParty({ firstName: 'Amara', joinedAt: '2026-10-04T16:57:00Z' }) }),
    );
    renderAt('16:58:00');
    expect(screen.getByText('Joining…')).toBeVisible();
    expect(screen.queryByText('Joined')).not.toBeInTheDocument();
  });

  it('Google Meet reports no presence: Joined on the Join press', () => {
    room = remote(
      sessionRoom(
        { other: sampleParty({ firstName: 'Amara', joinedAt: '2026-10-04T16:57:00Z' }) },
        {},
        'google_meet',
      ),
    );
    renderAt('16:58:00');
    expect(screen.getByText('Joined')).toBeVisible();
  });

  it('Rejoin still follows the Join press, even before Daily has seen you', () => {
    room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:20:00');
    expect(screen.getByRole('button', { name: 'Rejoin session' })).toBeEnabled();
    expect(screen.getByText('Joining…')).toBeVisible();
  });

  it('Join opens the link the API minted for this caller', async () => {
    join.mockImplementation((_id, { onSuccess }) =>
      onSuccess({ meetingUrl: 'https://room.test/x' }),
    );
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    renderAt('16:56:00');
    await userEvent.click(screen.getByRole('button', { name: 'Join session' }));
    expect(join).toHaveBeenCalledWith('b1', expect.anything());
    expect(open).toHaveBeenCalledWith('https://room.test/x', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });

  it('attendance recorded with no link is said, not treated as a failure', async () => {
    join.mockImplementation((_id, { onSuccess }) => onSuccess({ meetingUrl: null }));
    renderAt('16:56:00');
    await userEvent.click(screen.getByRole('button', { name: 'Join session' }));
    await waitFor(() =>
      expect(
        screen.getAllByText('You’re marked as here, but this session has no meeting link yet.')[0],
      ).toBeInTheDocument(),
    );
  });

  it('a blocked popup offers the link instead of looking like a dead button', async () => {
    join.mockImplementation((_id, { onSuccess }) =>
      onSuccess({ meetingUrl: 'https://room.test/x' }),
    );
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderAt('16:56:00');
    await userEvent.click(screen.getByRole('button', { name: 'Join session' }));
    expect(screen.getByRole('link', { name: 'Open the session' })).toHaveAttribute(
      'href',
      'https://room.test/x',
    );
    open.mockRestore();
  });

  it('the server refusing a late first arrival says the rule, as the page does', async () => {
    room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    door.mockImplementation((_id, { onError }) =>
      onError(new ApiError(409, 'Join window closed', '/problems/join-window-closed')),
    );
    renderAt('17:25:00');
    await userEvent.click(screen.getByRole('button', { name: 'Rejoin session' }));
    expect(
      screen.getByText('Joining closed at 6:15 pm, 15 minutes after the start.', {
        selector: 'p:not(.sr-only)',
      }),
    ).toBeVisible();
    expect(
      screen.queryByText('This session isn’t open to join right now.'),
    ).not.toBeInTheDocument();
  });

  it('a 409 says the window is shut, not that something broke', async () => {
    join.mockImplementation((_id, { onError }) => onError(new ApiError(409)));
    renderAt('16:56:00');
    await userEvent.click(screen.getByRole('button', { name: 'Join session' }));
    expect(
      screen.getAllByText('This session isn’t open to join right now.')[0],
    ).toBeInTheDocument();
  });
});

describe('during the call', () => {
  it('shows no timer, since the call may run elsewhere, and asks a newcomer to join now', () => {
    renderAt('17:12:00');
    expect(screen.getByText('In progress')).toBeVisible();
    expect(screen.queryByText('In session')).not.toBeInTheDocument();
    expect(screen.queryByText(/min left/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join now' })).toBeEnabled();
  });

  it('no Add to calendar once it has started', () => {
    renderAt('17:12:00');
    expect(screen.queryByRole('button', { name: 'Add to calendar' })).not.toBeInTheDocument();
  });

  it('a first arrival goes through /join, the attendance record', async () => {
    renderAt('17:12:00');
    await userEvent.click(screen.getByRole('button', { name: 'Join now' }));
    expect(join).toHaveBeenCalledWith('b1', expect.anything());
    expect(door).not.toHaveBeenCalled();
  });

  it('someone who has been in rejoins through /door, which records nothing', async () => {
    room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:12:00');
    await userEvent.click(screen.getByRole('button', { name: 'Rejoin session' }));
    expect(door).toHaveBeenCalledWith('b1', expect.anything());
    expect(join).not.toHaveBeenCalled();
  });

  it('after the window, someone who has been in can still rejoin until the end (#379)', async () => {
    room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    door.mockImplementation((_id, { onSuccess }) =>
      onSuccess({ meetingUrl: 'https://room.test/x' }),
    );
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    renderAt('17:25:00');
    await userEvent.click(screen.getByRole('button', { name: 'Rejoin session' }));
    expect(open).toHaveBeenCalledWith('https://room.test/x', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });

  it('says plainly when the door has no way in, without calling it an error', async () => {
    room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    door.mockImplementation((_id, { onSuccess }) => onSuccess({ meetingUrl: null }));
    renderAt('17:25:00');
    await userEvent.click(screen.getByRole('button', { name: 'Rejoin session' }));
    expect(
      screen.getByText('There’s no way into this call right now. Try again in a moment.', {
        selector: 'p:not(.sr-only)',
      }),
    ).toBeVisible();
  });

  it('keeps the call on screen when the session is settled while still running', () => {
    room = remote(sessionRoom({ status: 'completed' }, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:20:00');
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Rejoin session' })).toBeEnabled();
  });

  it('after the window, a first-timer is not let in (product, 2026-10-08)', () => {
    renderAt('17:20:00');
    expect(screen.queryByRole('button', { name: /join/i })).not.toBeInTheDocument();
    expect(
      screen.getByText('Joining closed at 6:15 pm, 15 minutes after the start.'),
    ).toBeVisible();
  });
});

describe('after the call, before attendance is settled', () => {
  it('says it is being confirmed, and never guesses who missed it', () => {
    room = remote(
      sessionRoom({}, { joinedAt: '2026-10-04T17:00:40Z', inRoomAt: '2026-10-04T17:01:00Z' }),
    );
    renderAt('17:40:00');
    expect(screen.getByText('Ended')).toBeVisible();
    expect(screen.getByText('Joined at 6:01 pm')).toBeVisible();
    expect(screen.getByText('No arrival recorded')).toBeVisible();
    expect(screen.queryByText(/didn’t join/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Quick guide for a rewarding session')).not.toBeInTheDocument();
  });

  it('shows a past arrival in green', () => {
    room = remote(
      sessionRoom({}, { joinedAt: '2026-10-04T17:00:40Z', inRoomAt: '2026-10-04T17:01:00Z' }),
    );
    renderAt('17:40:00');
    const you = screen.getByText('Joined at 6:01 pm').closest('.person')!;
    expect(you).toHaveClass('joined', 'green');
  });

  it('a Daily press never seen in the room says what was recorded, not that they joined', () => {
    room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:40:00');
    expect(screen.getByText('Pressed Join at 6:01 pm')).toBeVisible();
    expect(screen.queryByText('Joined at 6:01 pm')).not.toBeInTheDocument();
  });

  it('Google Meet: the Join press is the arrival', () => {
    room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }, 'google_meet'));
    renderAt('17:40:00');
    expect(screen.getByText('Joined at 6:01 pm')).toBeVisible();
  });
});

describe('getting ready', () => {
  it('holds the answers row’s place while they load, rather than popping it in', () => {
    answers = remote<BookingAnswer[]>(null, { isLoading: true });
    const { container } = renderAt('15:15:00');
    expect(container.querySelector('.prep')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('.placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /wants to talk about/ })).not.toBeInTheDocument();
  });

  it('hides the answers row when nothing was answered', () => {
    renderAt('15:15:00');
    expect(screen.queryByRole('button', { name: /wants to talk about/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick guide/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('opens the mentee’s answers in place', async () => {
    answers = remote([answer('Funded vs unfunded offers')]);
    renderAt('15:15:00');
    const row = screen.getByRole('button', { name: /What Amara wants to talk about/ });
    await userEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByText('Funded vs unfunded offers').length).toBeGreaterThan(0);
  });

  it('addresses the mentee’s own answers to them', () => {
    room = remote(sessionRoom({ side: 'mentee' }));
    answers = remote([answer('Funded vs unfunded offers')]);
    renderAt('15:15:00');
    expect(screen.getByRole('button', { name: /What you’ll talk about/ })).toBeVisible();
  });

  it('never promises rescheduling or messaging, which do not exist', async () => {
    renderAt('15:15:00');
    await userEvent.click(screen.getByRole('button', { name: /Quick guide/ }));
    expect(
      screen.getByText('Cancel at least 12 hours before, so the time can go to someone else.'),
    ).toBeVisible();
    expect(screen.queryByText(/reschedule|message/i)).not.toBeInTheDocument();
  });
});

describe('what a screen reader hears', () => {
  const srStatus = () => screen.getAllByRole('status').find((el) => el.className === 'sr-only')!;

  it('says a join problem once: the visible line is not a second live region', async () => {
    join.mockImplementation((_id, { onError }) => onError(new ApiError(409)));
    renderAt('16:56:00');
    await userEvent.click(screen.getByRole('button', { name: 'Join session' }));
    const regions = screen
      .getAllByRole('status')
      .filter((el) => el.textContent?.includes('isn’t open to join'));
    expect(regions).toHaveLength(1);
    expect(
      screen.getByText('This session isn’t open to join right now.', {
        selector: 'p:not(.sr-only)',
      }),
    ).toBeVisible();
  });

  it('says a blocked meeting window through the page’s region; the notice is only the link', async () => {
    join.mockImplementation((_id, { onSuccess }) =>
      onSuccess({ meetingUrl: 'https://room.test/x' }),
    );
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderAt('16:56:00');
    await userEvent.click(screen.getByRole('button', { name: 'Join session' }));
    expect(srStatus()).toHaveTextContent('Your browser blocked the meeting window.');
    const link = screen.getByRole('link', { name: 'Open the session' });
    expect(link.closest('[role="status"]')).toBeNull();
    open.mockRestore();
  });

  it('does not say joining has closed to someone who can still rejoin', () => {
    room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:14:58');
    act(() => void vi.advanceTimersByTime(3000));
    expect(srStatus()).not.toHaveTextContent('Joining has closed.');
  });

  it('says joining has closed to someone who never joined', () => {
    renderAt('17:14:58');
    act(() => void vi.advanceTimersByTime(3000));
    expect(srStatus()).toHaveTextContent('Joining has closed.');
  });

  it('does not announce someone who had already joined when the page opened', () => {
    room = remote(
      sessionRoom({
        other: sampleParty({
          firstName: 'Amara',
          joinedAt: '2026-10-04T16:56:00Z',
          inRoomAt: '2026-10-04T16:56:10Z',
        }),
      }),
    );
    renderAt('16:58:00');
    expect(srStatus()).toBeEmptyDOMElement();
  });

  it('announces someone joining while the page is open, when Daily sees them in the room', () => {
    room = remote(
      sessionRoom({ other: sampleParty({ firstName: 'Amara', joinedAt: '2026-10-04T16:58:05Z' }) }),
    );
    const view = renderAt('16:58:00');
    // A press alone is not a join on EduFurther video: nothing said yet.
    expect(srStatus()).toBeEmptyDOMElement();
    room = remote(
      sessionRoom({
        other: sampleParty({
          firstName: 'Amara',
          joinedAt: '2026-10-04T16:58:05Z',
          inRoomAt: '2026-10-04T16:58:10Z',
        }),
      }),
    );
    view.rerender(<SessionJoinScreen id="b1" />);
    expect(srStatus()).toHaveTextContent('Amara joined.');
    expect(srStatus()).not.toHaveTextContent('is here');
  });

  it('never the ticking clock, but the door opening, once', () => {
    renderAt('16:54:58');
    const status = screen.getAllByRole('status').find((el) => el.className === 'sr-only')!;
    expect(status).toBeEmptyDOMElement();
    act(() => void vi.advanceTimersByTime(3000));
    expect(status).toHaveTextContent('Join is open.');
    expect(status).not.toHaveTextContent(/\d\d:\d\d/);
  });
});
