import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { BookingAnswer, SessionRoom } from '@/types/booking';
import type { AppError } from '@/types/mentor';
import { explainer, viewers } from '@/app/_shell/lockedPage.harness';
import {
  answer,
  at,
  h,
  MENTEE,
  remote,
  replace,
  sent,
  sessionRoom,
  setupSessionJoinHarness,
} from './sessionJoin.harness';
import { SessionJoinScreen } from './SessionJoinScreen';

// The frame, the four states, the outcomes, getting ready and what is announced.
// The lobby's phases are in SessionJoinLobby.test.tsx.

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
vi.mock('@/lib/api/data/intakeFiles', async () =>
  (await import('./sessionJoin.harness')).mocks.intakeFiles(),
);

setupSessionJoinHarness();

function renderAt(time: string) {
  vi.setSystemTime(at(time));
  return render(<SessionJoinScreen id="b1" />);
}

describe('the frame', () => {
  it('has no nav rail, and its one way back goes to Bookings', () => {
    renderAt('15:15:00');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Bookings' })).toHaveAttribute(
      'href',
      '/bookings',
    );
  });

  it('the logo goes to the viewer’s Home', () => {
    renderAt('15:15:00');
    expect(screen.getByRole('link', { name: 'EduFurther: Home' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('a mentee’s logo goes to their Home', () => {
    h.viewer = MENTEE;
    renderAt('15:15:00');
    expect(screen.getByRole('link', { name: 'EduFurther: Home' })).toHaveAttribute('href', '/home');
  });

  it('the card ends with a prefilled email to support: session, time, name and role', () => {
    renderAt('15:15:00');
    expect(screen.getByText('Having a problem?')).toBeVisible();
    const href = screen.getByRole('link', { name: 'Contact support' }).getAttribute('href')!;
    expect(href.startsWith('mailto:support@edufurther.org?')).toBe(true);
    const q = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(q.get('subject')).toBe('Session: please help (Gbenga Ogundipe)');
    expect(q.get('body')).toBe(
      [
        'Hi EduFurther team,',
        '',
        'I had a problem with my session.',
        '',
        'What happened:',
        '- ',
        '',
        'Session: 1:1 call with Amara Okafor, Sun, Oct 4, 6:00 – 6:30 pm',
        'Name: Gbenga Ogundipe',
        'Role: Mentor',
        '',
        'Thanks,',
        'Gbenga',
      ].join('\n'),
    );
  });

  it('a session that fails to load still offers support', () => {
    h.room = remote<SessionRoom>(null, { error: { status: 500 } as AppError });
    renderAt('15:15:00');
    expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
      'href',
      'mailto:support@edufurther.org',
    );
  });

  it('a guest is asked to log in, and comes back here after', () => {
    h.viewer = { kind: 'guest' };
    h.room = remote<SessionRoom>(null);
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
    h.viewer = { kind: 'guest' };
    h.room = remote<SessionRoom>(null);
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
    h.room = remote<SessionRoom>(null, { isLoading: true });
    renderAt('15:15:00');
    expect(screen.getByLabelText('Loading your session')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(/couldn’t/)).not.toBeInTheDocument();
  });

  it('a failed read offers a retry, never "not found"', async () => {
    const retry = vi.fn();
    h.room = remote<SessionRoom>(null, { error: { status: 500 } as AppError, retry });
    renderAt('15:15:00');
    expect(screen.getByText('We couldn’t load this session')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it.each([403, 404, 422])('a %s reads as not available, with the way back', (status) => {
    h.room = remote<SessionRoom>(null, { error: { status } as AppError });
    renderAt('15:15:00');
    expect(screen.getByText('This session isn’t available')).toBeVisible();
  });

  it('a failed refetch keeps the session on screen', () => {
    h.room = remote(sessionRoom(), { error: { status: 500 } as AppError });
    renderAt('15:15:00');
    expect(screen.getByRole('heading', { name: '1:1 call with Amara Okafor' })).toBeVisible();
  });

  it.each(['cancelled', 'pending'] as const)(
    'a %s session is handed to Bookings, replacing this entry',
    (status) => {
      h.room = remote(sessionRoom({ status }));
      renderAt('15:15:00');
      expect(replace).toHaveBeenCalledWith('/bookings?booking=b1');
    },
  );

  it.each(['completed', 'noShow'] as const)(
    'a %s session stays here once it has ended',
    (status) => {
      h.room = remote(sessionRoom({ status }));
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
    h.viewer = MENTEE;
    h.room = completed('mentee');
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
    h.viewer = MENTEE;
    h.room = completed('mentee');
    renderAt('17:40:00');
    expect(screen.getByText('Completed')).toBeVisible();
    expect(screen.getAllByText('Joined')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /join/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /join/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Quick guide for a rewarding session')).not.toBeInTheDocument();
  });

  it('a mentee reviews here, in the review modal, and is thanked on the page', async () => {
    h.viewer = MENTEE;
    h.room = completed('mentee');
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
    h.reviewables = remote([]);
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
    h.viewer = MENTEE;
    h.room = completed('mentee');
    h.reviewables = remote<{ id: string; startsAt: string; typeName: string | null }[]>(null, {
      isLoading: true,
    });
    renderAt('17:40:00');
    expect(screen.getByText('How was your session with Amara?')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Leave a review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Book again' })).not.toBeInTheDocument();
  });

  it('a failed reviewability check says so, retries, and keeps Book again', async () => {
    h.viewer = MENTEE;
    h.room = completed('mentee');
    const retry = vi.fn();
    h.reviewables = remote<{ id: string; startsAt: string; typeName: string | null }[]>(null, {
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
    h.room = completed('mentor');
    renderAt('17:40:00');
    expect(screen.getByText('Nice work. Session complete.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Leave a review' })).not.toBeInTheDocument();
    // The header's way back, and the outcome's own action.
    expect(screen.getAllByRole('link', { name: 'Go to Bookings' })).toHaveLength(2);
  });
});

describe('a Join notice belongs to joining', () => {
  it('is gone once the session has settled', async () => {
    h.room = remote(sessionRoom({}, {}));
    h.search = new URLSearchParams('enter=notopen');
    const view = renderAt('17:10:00');
    expect(
      screen.getByText('This session isn’t open to join right now.', {
        selector: 'p:not(.sr-only)',
      }),
    ).toBeVisible();
    h.room = remote(sessionRoom({ status: 'completed' }));
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
    h.viewer = MENTEE;
    h.room = missedRoom('mentee', 'attended', 'noShow');
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
    h.viewer = MENTEE;
    h.room = missedRoom('mentee', 'noShow', 'attended');
    renderAt('17:40:00');
    expect(screen.getByText('You missed this session')).toBeVisible();
    expect(screen.queryByText(/waited/)).not.toBeInTheDocument();
  });
});

describe('getting ready', () => {
  // Session Join.dc.html `layout=lobbySplit`: beside the lobby on wider
  // screens (an aside, always open), and two buttons that open sheets on
  // phones. jsdom applies no media queries, so both are in the DOM here.
  const aside = () => screen.getByRole('complementary', { name: 'Getting ready' });

  it('holds the answers card’s place while they load, rather than popping it in', () => {
    h.answers = remote<BookingAnswer[]>(null, { isLoading: true });
    const { container } = renderAt('15:15:00');
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(
      within(aside()).queryByRole('heading', { name: /wants to talk about/ }),
    ).not.toBeInTheDocument();
  });

  it('hides the answers when nothing was answered; the guide still shows', () => {
    renderAt('15:15:00');
    expect(screen.queryByText(/wants to talk about/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Amara’s answers/ })).not.toBeInTheDocument();
    expect(
      within(aside()).getByRole('heading', { name: 'Quick guide for a rewarding session' }),
    ).toBeVisible();
  });

  it('shows the mentee’s answers beside the lobby, open, without a toggle', () => {
    h.answers = remote([answer('Funded vs unfunded offers')]);
    renderAt('15:15:00');
    const side = aside();
    expect(
      within(side).getByRole('heading', { name: 'What Amara wants to talk about' }),
    ).toBeVisible();
    // Never "her": nothing tells us Amara's pronouns.
    expect(within(side).getByText('From Amara’s booking answers.')).toBeVisible();
    expect(within(side).getByText('Funded vs unfunded offers')).toBeVisible();
    expect(within(side).queryByRole('button', { expanded: false })).not.toBeInTheDocument();
  });

  it('addresses the mentee’s own answers to them, and claims nothing about who read them', () => {
    h.room = remote(sessionRoom({ side: 'mentee' }));
    h.answers = remote([answer('Funded vs unfunded offers')]);
    renderAt('15:15:00');
    expect(within(aside()).getByRole('heading', { name: 'What you’ll talk about' })).toBeVisible();
    expect(within(aside()).getByText('Your answers from booking.')).toBeVisible();
    expect(screen.queryByText(/has read/)).not.toBeInTheDocument();
  });

  it('a failed read keeps the card, with a retry', async () => {
    const retry = vi.fn();
    h.answers = remote<BookingAnswer[]>(null, { error: { status: 500 } as AppError, retry });
    renderAt('15:15:00');
    expect(within(aside()).getByText('We couldn’t load the answers.')).toBeVisible();
    await userEvent.click(within(aside()).getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('lists the guide open, and never promises rescheduling or messaging', () => {
    h.answers = remote([answer('Funded vs unfunded offers')]);
    renderAt('15:15:00');
    // No deadline on this fixture, so the tip names no number at all rather
    // than guessing one it cannot know.
    expect(
      within(aside()).getByText('Cancel in good time, so the time can go to someone else.'),
    ).toBeVisible();
    expect(within(aside()).queryByText(/\d+ hours before/)).not.toBeInTheDocument();
    expect(within(aside()).queryByText(/reschedule|message/i)).not.toBeInTheDocument();
    // The tip no longer points "above": the answers are beside it, or behind a button.
    expect(
      within(aside()).getByText('Read Amara’s answers and have one next step ready for them.'),
    ).toBeVisible();
  });

  it('on phones, a button opens the answers in a sheet and gives focus back on close', async () => {
    h.answers = remote([answer('Funded vs unfunded offers')]);
    renderAt('15:15:00');
    const open = screen.getByRole('button', { name: 'Amara’s answers' });
    expect(open).toHaveAttribute('aria-haspopup', 'dialog');
    await userEvent.click(open);
    const sheet = screen.getByRole('dialog', { name: 'What Amara wants to talk about' });
    expect(within(sheet).getByText('Funded vs unfunded offers')).toBeVisible();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(open).toHaveFocus();
  });

  it('on phones, the quick guide opens in its own sheet', async () => {
    h.room = remote(sessionRoom({ side: 'mentee' }));
    h.answers = remote([answer('Funded vs unfunded offers')]);
    renderAt('15:15:00');
    expect(screen.getByRole('button', { name: 'Your answers' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Quick guide' }));
    const sheet = screen.getByRole('dialog', { name: 'Quick guide' });
    expect(within(sheet).getByText('Check your setup')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('on phones, Add to calendar opens its choices in a sheet', async () => {
    h.phone = true;
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderAt('15:15:00');
    await userEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    const sheet = screen.getByRole('dialog', { name: 'Add to calendar' });
    await userEvent.click(within(sheet).getByRole('button', { name: /Google Calendar/ }));
    expect(open).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    open.mockRestore();
  });

  it('a sheet whose content goes away closes, and focus lands on the title, not <body>', async () => {
    // Codex on PR 206: Add to calendar disappears once Join opens (5 minutes before).
    h.phone = true;
    renderAt('16:54:58');
    await userEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    expect(screen.getByRole('dialog', { name: 'Add to calendar' })).toBeInTheDocument();
    await act(async () => {
      vi.setSystemTime(at('16:55:03'));
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('the guide sheet closes the same way when the session is over', async () => {
    const view = renderAt('15:15:00');
    await userEvent.click(screen.getByRole('button', { name: 'Quick guide' }));
    expect(screen.getByRole('dialog', { name: 'Quick guide' })).toBeInTheDocument();
    h.room = remote(sessionRoom({ status: 'completed' }));
    await act(async () => {
      vi.setSystemTime(at('17:40:00'));
      view.rerender(<SessionJoinScreen id="b1" />);
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('widens the page only while there is something to get ready for', () => {
    // Loading starts wide: most visits are before a session, so nothing jumps sideways.
    h.room = remote<SessionRoom>(null, { isLoading: true });
    const loading = renderAt('15:15:00');
    expect(loading.container.querySelector('main')).toHaveClass('wide');
    loading.unmount();
    h.room = remote(sessionRoom());
    const { container, unmount } = renderAt('15:15:00');
    expect(container.querySelector('main')).toHaveClass('wide');
    unmount();
    h.room = remote(sessionRoom({ status: 'completed' }));
    const done = renderAt('17:40:00');
    expect(done.container.querySelector('main')).not.toHaveClass('wide');
    expect(screen.queryByRole('complementary', { name: 'Getting ready' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quick guide' })).not.toBeInTheDocument();
  });

  it('names the deployment’s window, not a remembered twelve', async () => {
    // A 10-hour window. Left hard-coded, this tip contradicted the cancel
    // dialog on the same screen — both describe the same deadline.
    const r = sessionRoom({ side: 'mentee' });
    h.room = remote({
      ...r,
      booking: { ...r.booking, refundUntil: '2026-10-04T07:00:00Z' },
    });
    renderAt('15:15:00');
    expect(within(aside()).getByText(/Cancel at least 10 hours before/)).toBeVisible();
    expect(screen.queryByText(/12 hours/)).not.toBeInTheDocument();
  });
});

describe('what a screen reader hears', () => {
  const srStatus = () => screen.getAllByRole('status').find((el) => el.className === 'sr-only')!;

  it('does not say joining has closed to someone who can still rejoin', () => {
    h.room = remote(sessionRoom({}, { joinedAt: '2026-10-04T17:01:00Z' }));
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
    h.room = remote(
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
    h.room = remote(
      sessionRoom({ other: sampleParty({ firstName: 'Amara', joinedAt: '2026-10-04T16:58:05Z' }) }),
    );
    const view = renderAt('16:58:00');
    // A press alone is not a join on EduFurther video: nothing said yet.
    expect(srStatus()).toBeEmptyDOMElement();
    h.room = remote(
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

describe('the setup lock: a session is a booking (owner, 2026-10-20)', () => {
  it.each([
    ['an unfinished mentee', viewers.menteeUnfinished, explainer.menteeSetup('Bookings')],
    ['a mentor sign-up, not started', viewers.mentorSignup, explainer.mentorSetup('Bookings')],
    [
      'a mentor who never sent their application',
      viewers.mentorUnfinished,
      explainer.mentorSetup('Bookings'),
    ],
  ])('%s gets the explainer, not the session', (_who, v, e) => {
    h.viewer = v;
    h.room = remote<SessionRoom>(null);
    renderAt('15:15:00');
    // The page keeps its own frame (logo, back link): the explainer is its card.
    expect(screen.getByRole('heading', { level: 1, name: e.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: e.cta })).toHaveAttribute('href', e.href);
  });
});
