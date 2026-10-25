import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { SessionRoom } from '@/types/booking';
import type { AppError } from '@/types/mentor';
import {
  at,
  cancel,
  h,
  remote,
  replace,
  sessionRoom,
  setSearch,
  slotZones,
  setupSessionJoinHarness,
} from './sessionJoin.harness';
import { SessionJoinScreen } from './SessionJoinScreen';

// The lobby through its phases: before the window, open, during and after the call,
// and back from the entry route. Shares sessionJoin.harness with SessionJoinScreen.test.tsx.

// The setup lock's flags, switchable per test (lockedPage.harness).
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

setupSessionJoinHarness();

function renderAt(time: string) {
  vi.setSystemTime(at(time));
  return render(<SessionJoinScreen id="b1" />);
}

describe('before the window', () => {
  it('names the session, the day, the time, whose clock, and the venue', () => {
    renderAt('15:15:00');
    expect(
      screen.getByRole('heading', { level: 1, name: '1:1 call with Amara Okafor' }),
    ).toBeVisible();
    expect(screen.getByText('Sun, Oct 4 · 6:00 – 6:30 pm · EduFurther video')).toBeVisible();
    expect(screen.getByText('Upcoming')).toBeVisible();
  });

  it('counts down, and Join stays locked with when it opens', () => {
    renderAt('15:15:00');
    expect(screen.getByText('1:45:00')).toBeVisible();
    // One countdown to the door, on the button: no line under the clock.
    expect(screen.getAllByText('Join opens in 1:40:00')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Join opens in 1:40:00' })).toBeDisabled();
    expect(screen.getByText('The button becomes active 5 minutes before the start.')).toBeVisible();
  });

  it('says whose clock the times are in, with a way to change it', () => {
    renderAt('15:15:00');
    expect(screen.getByText('Times shown in')).toBeVisible();
    expect(screen.getByRole('button', { name: /Change time zone/ })).toBeVisible();
  });

  it('another zone re-times the page and the support email; the cancel dialog keeps the account’s', async () => {
    renderAt('15:15:00');
    await userEvent.click(screen.getByRole('button', { name: /Change time zone/ }));
    await userEvent.click(
      within(screen.getByRole('list', { name: 'Time zones' })).getByRole('button', {
        name: /Accra \(GMT\)/,
      }),
    );
    expect(screen.getByText('Sun, Oct 4 · 5:00 – 5:30 pm · EduFurther video')).toBeVisible();
    const href = screen.getByRole('link', { name: 'Contact support' }).getAttribute('href')!;
    expect(new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('body')).toContain(
      'Session: 1:1 call with Amara Okafor, Sun, Oct 4, 5:00 – 5:30 pm Accra (GMT)',
    );
    // Suggesting a time is about the mentor's own calendar: their account's zone.
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(slotZones.length).toBeGreaterThan(0);
    expect(slotZones.every((z) => z === 'Africa/Lagos')).toBe(true);
  });

  it('offers Add to calendar, Reschedule and Cancel while upcoming', () => {
    renderAt('15:15:00');
    expect(screen.getByRole('button', { name: 'Add to calendar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  it('Reschedule opens the cancel dialog, where a mentor suggests a new time', async () => {
    renderAt('15:15:00');
    await userEvent.click(screen.getByRole('button', { name: 'Reschedule' }));
    expect(screen.getByRole('dialog', { name: 'Cancel this booking?' })).toBeInTheDocument();
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
    const dialog = screen.getByRole('dialog', { name: 'Cancel this booking?' });
    // This fixture is the mentor's side, so the dialog opens offering Amara
    // another time instead — the design's default. Offering and giving a
    // reason are alternatives, so the chips only exist once the offer is off.
    await userEvent.click(
      within(dialog).getByRole('switch', { name: 'Suggest a new time to Amara' }),
    );
    // The reason is required since 2026-10-10, here as on Bookings: the dialog
    // is one component and this screen gets the rule whether it asked or not.
    await userEvent.click(within(dialog).getByRole('button', { name: 'A clash in my calendar' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, cancel session' }));
    expect(cancel.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'b1', reasonCode: 'scheduling_conflict' }),
      expect.anything(),
    );
  });

  it('will not call it off with no reason given', async () => {
    renderAt('15:15:00');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel this booking?' });
    await userEvent.click(
      within(dialog).getByRole('switch', { name: 'Suggest a new time to Amara' }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, cancel session' }));
    expect(within(dialog).getByText('Pick a reason before you go on.')).toBeVisible();
    // Blocked, not merely scolded: nothing was sent.
    expect(cancel.mutate).not.toHaveBeenCalled();
  });

  it('will not call it off with the offer on and no time picked either', async () => {
    // The other half of the same rule, and the one that used to be a silent
    // no-op: a mentor whose calendar has nothing open opens on this path with
    // nothing to pick, so the confirm has to say what to do rather than
    // swallow the press.
    renderAt('15:15:00');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel this booking?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel and send' }));
    expect(
      within(dialog).getByText('Pick a time, or switch this off to give a reason instead.'),
    ).toBeVisible();
    expect(cancel.mutate).not.toHaveBeenCalled();
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
    expect(screen.getByRole('link', { name: 'Join session (opens in a new tab)' })).toBeVisible();
    expect(screen.getByText('Opens in your browser. No download needed.')).toBeVisible();
    expect(screen.getByText('Ready when you are')).toBeVisible();
  });

  it('no links once Join opens: no Add to calendar, Reschedule or Cancel', () => {
    renderAt('16:56:00');
    expect(screen.queryByRole('button', { name: 'Add to calendar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reschedule' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('the hint is the venue’s alone, even once the other person is in', () => {
    h.room = remote(
      sessionRoom({
        other: sampleParty({
          firstName: 'Amara',
          joinedAt: '2026-10-04T17:00:20Z',
          inRoomAt: '2026-10-04T17:00:30Z',
        }),
      }),
    );
    renderAt('17:02:00');
    expect(screen.getByText('Opens in your browser. No download needed.')).toBeVisible();
    expect(screen.queryByText(/has joined/)).not.toBeInTheDocument();
  });

  it('EduFurther video: Joined once Daily has seen them in the room, never "Here now"', () => {
    h.room = remote(
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
    h.room = remote(
      sessionRoom({ other: sampleParty({ firstName: 'Amara', joinedAt: '2026-10-04T16:57:00Z' }) }),
    );
    renderAt('16:58:00');
    expect(screen.getByText('Joining…')).toBeVisible();
    expect(screen.queryByText('Joined')).not.toBeInTheDocument();
  });

  it('Google Meet reports no presence: Joined on the Join press', () => {
    h.room = remote(
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
    h.room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:20:00');
    expect(screen.getByRole('link', { name: 'Rejoin call (opens in a new tab)' })).toBeVisible();
    expect(screen.getByText('Joining…')).toBeVisible();
  });

  it('Join is a new-tab link to our entry route, which records the arrival (#207)', async () => {
    const open = vi.spyOn(window, 'open');
    renderAt('16:56:00');
    const join = screen.getByRole('link', { name: 'Join session (opens in a new tab)' });
    expect(join).toHaveAttribute('href', '/sessions/b1/enter');
    expect(join).toHaveAttribute('target', '_blank');
    expect(join).toHaveAttribute('rel', 'noopener noreferrer');
    // An ordinary link: the browser opens the tab, nothing here does.
    join.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(join);
    expect(open).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('back from the entry route (?enter=)', () => {
  const visible = (text: string) => screen.getByText(text, { selector: 'p:not(.sr-only)' });
  const srStatus = () => screen.getAllByRole('status').find((el) => el.className === 'sr-only')!;

  it.each([
    ['nolink', 'There’s no way into this call right now. Try again in a moment.'],
    ['notopen', 'This session isn’t open to join right now.'],
    ['failed', 'We couldn’t join you. Try again in a moment.'],
  ])('%s: shown under Join, said once, and the parameter goes', (enter, text) => {
    h.search = new URLSearchParams(`enter=${enter}`);
    renderAt('16:56:00');
    expect(visible(text)).toBeVisible();
    expect(srStatus()).toHaveTextContent(text);
    // The visible line is not a second live region.
    expect(
      screen.getAllByRole('status').filter((el) => el.textContent?.includes(text)),
    ).toHaveLength(1);
    expect(replace).toHaveBeenCalledWith('/sessions/b1', { scroll: false });
  });

  it('closed: says the rule, as the page does', () => {
    h.room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    h.search = new URLSearchParams('enter=closed');
    renderAt('17:25:00');
    expect(visible('Joining closed at 6:15 pm, 15 minutes after the start.')).toBeVisible();
    expect(srStatus()).toHaveTextContent('Joining closed at 6:15 pm, 15 minutes after the start.');
    expect(
      screen.queryByText('This session isn’t open to join right now.'),
    ).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/sessions/b1', { scroll: false });
  });

  it('closed, on an older row with no window: the plain refusal', () => {
    const r = sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' });
    h.room = remote({ ...r, booking: { ...r.booking, joinClosesAt: null } });
    h.search = new URLSearchParams('enter=closed');
    renderAt('17:12:00');
    expect(visible('This session isn’t open to join right now.')).toBeVisible();
  });

  it('closed, when the lobby already says the rule: printed once, still said', () => {
    h.search = new URLSearchParams('enter=closed');
    renderAt('17:20:00');
    expect(
      screen.getAllByText('Joining closed at 6:15 pm, 15 minutes after the start.', {
        selector: 'p:not(.sr-only)',
      }),
    ).toHaveLength(1);
    expect(srStatus()).toHaveTextContent('Joining closed at 6:15 pm, 15 minutes after the start.');
  });

  it('waits for the session before saying anything, then says it', () => {
    h.room = remote<SessionRoom>(null, { isLoading: true });
    h.search = new URLSearchParams('enter=failed');
    const view = renderAt('16:56:00');
    expect(replace).not.toHaveBeenCalled();
    h.room = remote(sessionRoom());
    view.rerender(<SessionJoinScreen id="b1" />);
    expect(visible('We couldn’t join you. Try again in a moment.')).toBeVisible();
    expect(replace).toHaveBeenCalledWith('/sessions/b1', { scroll: false });
  });

  it('keeps other parameters, and drops an unknown value without a word', () => {
    h.search = new URLSearchParams('enter=whatever&x=1');
    renderAt('16:56:00');
    expect(replace).toHaveBeenCalledWith('/sessions/b1?x=1', { scroll: false });
    expect(screen.queryByText(/Try again in a moment/)).not.toBeInTheDocument();
  });

  it('nothing to say, and nothing replaced, without the parameter', () => {
    renderAt('16:56:00');
    expect(replace).not.toHaveBeenCalled();
  });

  it('the line stays after the parameter goes, and is said only once', () => {
    h.search = new URLSearchParams('enter=failed');
    renderAt('16:56:00');
    const said = srStatus().firstElementChild;
    expect(said).toHaveTextContent('We couldn’t join you. Try again in a moment.');
    // The strip re-rendered the page without the parameter.
    expect(h.search.get('enter')).toBeNull();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(visible('We couldn’t join you. Try again in a moment.')).toBeVisible();
    // The same node: the region was not handed the words a second time.
    expect(srStatus().firstElementChild).toBe(said);
  });

  it('a later ?enter= on the same page is said again', () => {
    h.search = new URLSearchParams('enter=failed');
    renderAt('16:56:00');
    const first = srStatus().firstElementChild;
    act(() => setSearch('enter=failed'));
    const again = srStatus().firstElementChild;
    expect(again).toHaveTextContent('We couldn’t join you. Try again in a moment.');
    expect(again).not.toBe(first);
    expect(h.search.get('enter')).toBeNull();
  });

  it('following Join drops the line', () => {
    h.search = new URLSearchParams('enter=notopen');
    renderAt('16:56:00');
    const join = screen.getByRole('link', { name: 'Join session (opens in a new tab)' });
    join.addEventListener('click', (e) => e.preventDefault());
    act(() => join.click());
    expect(
      screen.queryByText('This session isn’t open to join right now.', {
        selector: 'p:not(.sr-only)',
      }),
    ).not.toBeInTheDocument();
  });

  it('the line goes once the lobby moves on (a new phase or way in)', () => {
    h.search = new URLSearchParams('enter=notopen');
    renderAt('16:59:58');
    expect(visible('This session isn’t open to join right now.')).toBeVisible();
    // Starting soon → in progress: the Join on screen is a different one now.
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.getByRole('link', { name: 'Join session (opens in a new tab)' })).toBeVisible();
    expect(
      screen.queryByText('This session isn’t open to join right now.', {
        selector: 'p:not(.sr-only)',
      }),
    ).not.toBeInTheDocument();
  });

  it('a session that failed to load still loses the parameter, with nothing said', () => {
    h.room = remote<SessionRoom>(null, { error: { status: 500 } as AppError });
    h.search = new URLSearchParams('enter=failed');
    renderAt('16:56:00');
    expect(replace).toHaveBeenCalledWith('/sessions/b1', { scroll: false });
    expect(screen.getByText('We couldn’t load this session')).toBeVisible();
    expect(screen.queryByText(/couldn’t join you/)).not.toBeInTheDocument();
  });

  it('a session that has gone to Bookings leaves once, without a second replace racing it', () => {
    h.room = remote(sessionRoom({ status: 'cancelled' }));
    h.search = new URLSearchParams('enter=notopen');
    renderAt('15:15:00');
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/bookings?booking=b1');
  });
});

describe('during the call', () => {
  it('shows no timer, since the call may run elsewhere, and asks a newcomer to join now', () => {
    renderAt('17:12:00');
    expect(screen.getByText('In progress')).toBeVisible();
    expect(screen.queryByText('In session')).not.toBeInTheDocument();
    expect(screen.queryByText(/min left/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Join session (opens in a new tab)' })).toBeVisible();
  });

  it('no Add to calendar once it has started', () => {
    renderAt('17:12:00');
    expect(screen.queryByRole('button', { name: 'Add to calendar' })).not.toBeInTheDocument();
  });

  it('a first arrival: Join now links to the entry route', () => {
    renderAt('17:12:00');
    expect(screen.getByRole('link', { name: 'Join session (opens in a new tab)' })).toHaveAttribute(
      'href',
      '/sessions/b1/enter',
    );
  });

  it('someone who has been in: Rejoin links to the same route, which uses the door', () => {
    h.room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:12:00');
    expect(screen.getByRole('link', { name: 'Rejoin call (opens in a new tab)' })).toHaveAttribute(
      'href',
      '/sessions/b1/enter',
    );
  });

  it('after the window, someone who has been in can still rejoin until the end (#379)', () => {
    h.room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:25:00');
    expect(screen.getByRole('link', { name: 'Rejoin call (opens in a new tab)' })).toHaveAttribute(
      'href',
      '/sessions/b1/enter',
    );
  });

  it('the session id is encoded in the link', () => {
    vi.setSystemTime(at('17:12:00'));
    render(<SessionJoinScreen id="b 1/x" />);
    expect(screen.getByRole('link', { name: 'Join session (opens in a new tab)' })).toHaveAttribute(
      'href',
      '/sessions/b%201%2Fx/enter',
    );
  });

  it('keeps the call on screen when the session is settled while still running', () => {
    h.room = remote(sessionRoom({ status: 'completed' }, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:20:00');
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Rejoin call (opens in a new tab)' })).toBeVisible();
  });

  it('after the window, a first-timer is not let in (product, 2026-10-08)', () => {
    renderAt('17:20:00');
    expect(screen.queryByRole('link', { name: /join/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /join/i })).not.toBeInTheDocument();
    expect(
      screen.getByText('Joining closed at 6:15 pm, 15 minutes after the start.'),
    ).toBeVisible();
  });
});

describe('after the call, before attendance is settled', () => {
  it('says it is being confirmed, and never guesses who missed it', () => {
    h.room = remote(
      sessionRoom({}, { joinedAt: '2026-10-04T17:00:40Z', inRoomAt: '2026-10-04T17:01:00Z' }),
    );
    renderAt('17:40:00');
    expect(screen.getByText('Ended')).toBeVisible();
    expect(
      screen.getByText(
        'You’ve finished this session. We’re confirming who joined. Your booking updates when that’s done.',
      ),
    ).toBeVisible();
    expect(screen.getByText('Joined at 6:01 pm')).toBeVisible();
    expect(screen.getByText('No arrival recorded')).toBeVisible();
    expect(screen.queryByText(/didn’t join/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Quick guide' })).not.toBeInTheDocument();
  });

  it('shows a past arrival in green', () => {
    h.room = remote(
      sessionRoom({}, { joinedAt: '2026-10-04T17:00:40Z', inRoomAt: '2026-10-04T17:01:00Z' }),
    );
    renderAt('17:40:00');
    const you = screen.getByText('Joined at 6:01 pm').closest('.person')!;
    expect(you).toHaveClass('joined', 'green');
  });

  it('a Daily press never seen in the room says what was recorded, not that they joined', () => {
    h.room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
    renderAt('17:40:00');
    expect(screen.getByText('Pressed Join at 6:01 pm')).toBeVisible();
    expect(screen.queryByText('Joined at 6:01 pm')).not.toBeInTheDocument();
  });

  it('Google Meet: the Join press is the arrival', () => {
    h.room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }, 'google_meet'));
    renderAt('17:40:00');
    expect(screen.getByText('Joined at 6:01 pm')).toBeVisible();
  });
});
