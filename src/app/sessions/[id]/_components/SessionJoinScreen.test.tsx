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
vi.mock('@/lib/api/data/bookings', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useJoinSession: () => ({ mutate: join, isPending: false }),
}));

const cancel = { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null };
vi.mock('@/lib/api/data/bookingActions', () => ({ useBookingAction: () => cancel }));
vi.mock('@/lib/api/data/booking', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useSlots: () => ({ data: [], isLoading: false, error: null, retry: vi.fn() }),
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

// A 30-minute call at 6:00 pm Lagos (17:00 UTC); the window is 16:55–17:15.
const START = '2026-10-04T17:00:00Z';
const at = (hhmmss: string) => new Date(`2026-10-04T${hhmmss}Z`);

function sessionRoom(over: Partial<SessionRoom['booking']> = {}, me = {}): SessionRoom {
  return {
    booking: sampleBookingFor({
      side: 'mentor',
      other: sampleParty({ id: 'amara', name: 'Amara Okafor', firstName: 'Amara' }),
      startsAt: START,
      endsAt: '2026-10-04T17:30:00Z',
      durationMin: 30,
      joinOpensAt: '2026-10-04T16:55:00Z',
      joinClosesAt: '2026-10-04T17:15:00Z',
      ...over,
    }),
    me: sampleParty({ id: 'me', name: 'Gbenga Ogundipe', firstName: 'Gbenga', ...me }),
    typeName: '1:1 call',
    provider: 'daily',
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

  it.each(['cancelled', 'pending', 'completed', 'noShow'] as const)(
    'a %s session is handed to Bookings, replacing this entry',
    (status) => {
      room = remote(sessionRoom({ status }));
      renderAt('15:15:00');
      expect(replace).toHaveBeenCalledWith('/bookings?booking=b1');
    },
  );
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

  it('the other person shows as here once they have pressed Join', () => {
    room = remote(
      sessionRoom({ other: sampleParty({ firstName: 'Amara', joinedAt: '2026-10-04T16:57:00Z' }) }),
    );
    renderAt('16:58:00');
    expect(screen.getByText('Here now')).toBeVisible();
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
  it('counts up, says time left, and asks a newcomer to join now', () => {
    renderAt('17:12:00');
    expect(screen.getByText('In progress')).toBeVisible();
    expect(screen.getByText('12:00')).toBeVisible();
    expect(screen.getByText('18 min left')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Join now' })).toBeEnabled();
  });

  it('says Rejoin only to someone who has been in', () => {
    room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:12:00');
    expect(screen.getByRole('button', { name: 'Rejoin session' })).toBeEnabled();
  });

  it('once the window shuts, there is no Join that would only be refused (#379)', () => {
    renderAt('17:20:00');
    expect(screen.queryByRole('button', { name: /join/i })).not.toBeInTheDocument();
    expect(
      screen.getByText('Joining closed at 6:15 pm, 15 minutes after the start.'),
    ).toBeVisible();
  });
});

describe('after the call, before attendance is settled', () => {
  it('says it is being confirmed, and never guesses who missed it', () => {
    room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:40:00');
    expect(screen.getByText('Ended')).toBeVisible();
    expect(screen.getByText('Joined at 6:01 pm')).toBeVisible();
    expect(screen.getByText('No arrival recorded')).toBeVisible();
    expect(screen.queryByText(/didn’t join/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Quick guide for a rewarding session')).not.toBeInTheDocument();
  });

  it('shows a past arrival in green without the live pulse', () => {
    room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:40:00');
    const you = screen.getByText('Joined at 6:01 pm').closest('.person')!;
    expect(you).toHaveClass('joined', 'green');
    expect(you).not.toHaveClass('here');
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

  it('does not announce someone who was already here when the page opened', () => {
    room = remote(
      sessionRoom({ other: sampleParty({ firstName: 'Amara', joinedAt: '2026-10-04T16:56:00Z' }) }),
    );
    renderAt('16:58:00');
    expect(srStatus()).toBeEmptyDOMElement();
  });

  it('announces someone arriving while the page is open', () => {
    const view = renderAt('16:58:00');
    room = remote(
      sessionRoom({ other: sampleParty({ firstName: 'Amara', joinedAt: '2026-10-04T16:58:10Z' }) }),
    );
    view.rerender(<SessionJoinScreen id="b1" />);
    expect(srStatus()).toHaveTextContent('Amara is here.');
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
