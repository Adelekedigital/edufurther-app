import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { BookingParty } from '@/types/booking';
import {
  at,
  h,
  launched,
  MENTEE,
  push,
  reasonHook,
  reasons,
  remote,
  sessionRoom,
  setupSessionJoinHarness,
} from './sessionJoin.harness';
import { SessionJoinScreen } from './SessionJoinScreen';

// Book again on Session Join: the shared booking modal opens on this page
// (PRD Session Join), from every place that offers it, with the missed cards
// that offer it. Every card's words are sessionOutcome.test.ts's. Shares
// sessionJoin.harness with SessionJoinScreen.test.tsx.

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
vi.mock('@/lib/api/data/missedReason', async () =>
  (await import('./sessionJoin.harness')).mocks.missedReason(),
);

setupSessionJoinHarness();

function renderAt(time: string) {
  vi.setSystemTime(at(time));
  return render(<SessionJoinScreen id="b1" />);
}

type Attendance = BookingParty['attendance'];

/** A settled session, the viewer on `side`, against Amara Okafor. */
function settled(
  side: 'mentee' | 'mentor',
  status: 'completed' | 'noShow',
  mine: Attendance = 'attended',
  theirs: Attendance = 'attended',
) {
  return remote(
    sessionRoom(
      {
        status,
        side,
        myAttendance: mine,
        other: sampleParty({
          id: 'amara',
          name: 'Amara Okafor',
          firstName: 'Amara',
          attendance: theirs,
        }),
      },
      { attendance: mine },
    ),
  );
}

const booking = () => screen.queryByRole('dialog', { name: 'Book Amara Okafor' });

beforeEach(() => {
  h.viewer = MENTEE;
});

describe('Book again opens the booking modal on this page', () => {
  it('from the completed card, for the session’s mentor, and closes back to the page', async () => {
    h.room = settled('mentee', 'completed');
    renderAt('18:30:00');
    expect(booking()).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Book again' }));
    // The party mapped to a Mentor: the profile by id, the account's zone,
    // and no rating claimed (the row has none).
    expect(within(booking()!).getByText('/mentors/amara Africa/Lagos true')).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Close booking' }));
    expect(booking()).toBeNull();
  });

  it('from the review modal’s Book again, which closes the review first', async () => {
    h.room = settled('mentee', 'completed');
    renderAt('18:30:00');
    await userEvent.click(screen.getByRole('button', { name: 'Leave a review' }));
    await userEvent.click(screen.getByRole('button', { name: 'Book again from the review' }));
    expect(screen.queryByRole('dialog', { name: 'Review Amara' })).toBeNull();
    expect(booking()).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });

  it('from the missed card when the mentor missed it, beside Find another mentor', async () => {
    h.room = settled('mentee', 'noShow', 'attended', 'noShow');
    renderAt('18:30:00');
    expect(screen.getByText('Missed')).toBeVisible();
    expect(screen.getByText('Didn’t join')).toBeVisible();
    expect(screen.getByText('Amara didn’t join')).toBeVisible();
    expect(screen.getByText('Your credit is back.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Find another mentor' })).toHaveAttribute(
      'href',
      '/explore',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Book Amara again' }));
    expect(booking()).toBeVisible();
  });

  it.each([
    [
      'the mentee missed it',
      'noShow',
      'attended',
      // The wait is the row's: arrivals close 15 minutes in (backend JOIN_CLOSES).
      'Amara waited 15 minutes from the start. The credit for this session is used, and it counts as a missed session.',
    ],
    [
      'neither joined',
      'noShow',
      'noShow',
      'Neither of you joined within 15 minutes of the start, so the credit for this session is used.',
    ],
  ] as const)('from the missed card when %s: Book another time', async (_, mine, theirs, body) => {
    h.room = settled('mentee', 'noShow', mine, theirs);
    renderAt('18:30:00');
    expect(screen.getByText(body)).toBeVisible();
    expect(screen.queryByText(/Booking pauses/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Book another time' }));
    expect(booking()).toBeVisible();
  });

  it('never for a mentor whose account is gone: not on the card, nor in the review modal', async () => {
    h.room = remote(
      sessionRoom(
        {
          status: 'completed',
          side: 'mentee',
          myAttendance: 'attended',
          other: sampleParty({
            id: 'amara',
            name: 'Deleted user',
            firstName: 'Deleted user',
            deleted: true,
            attendance: 'attended',
          }),
        },
        { attendance: 'attended' },
      ),
    );
    renderAt('18:30:00');
    expect(screen.queryByRole('button', { name: 'Book again' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Leave a review' }));
    expect(screen.queryByRole('button', { name: 'Book again from the review' })).toBeNull();
  });

  it('never for a mentor: no Book control, and the launcher is never given anyone', () => {
    h.viewer = { ...MENTEE, isMentee: false, isApprovedMentor: true, isMentor: true };
    h.room = settled('mentor', 'noShow', 'noShow', 'attended');
    renderAt('18:30:00');
    expect(screen.getByText('You missed this session')).toBeVisible();
    expect(
      screen.getByText('Amara waited 15 minutes from the start, so Amara’s credit is back.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /Book/ })).toBeNull();
    // The header's way back, and the card's own action.
    expect(screen.getAllByRole('link', { name: 'Go to Bookings' })).toHaveLength(2);
    expect(launched.every((m) => m === null)).toBe(true);
  });
});

describe('the missed-reason form (internal only)', () => {
  it('the person who missed it is asked what happened; Send needs a chip', async () => {
    h.room = settled('mentee', 'noShow', 'noShow', 'attended');
    renderAt('18:30:00');
    const form = screen.getByRole('form', { name: 'What happened?' });
    expect(within(form).getByRole('button', { name: 'Send' })).toBeDisabled();
    // Internal (founder): nothing says the other person reads it.
    expect(screen.queryByText(/sees your answer|shared this/)).toBeNull();
    await userEvent.click(within(form).getByRole('button', { name: 'Wrong time zone' }));
    await userEvent.type(within(form).getByRole('textbox'), 'My calendar was on UTC');
    await userEvent.click(within(form).getByRole('button', { name: 'Send' }));
    expect(reasons).toEqual([{ reason: 'wrong_time_zone', note: 'My calendar was on UTC' }]);
  });

  it('once sent (here or before a reload): the thanks line, no form', () => {
    h.room = remote({
      ...settled('mentee', 'noShow', 'noShow', 'attended').data!,
      missedReasonSent: true,
    });
    renderAt('18:30:00');
    expect(screen.getByText('Thanks for letting us know.')).toBeVisible();
    expect(screen.queryByRole('form', { name: 'What happened?' })).toBeNull();
  });

  it('a failed send says so and keeps the form', () => {
    reasonHook.failed = 'retry';
    h.room = settled('mentee', 'noShow', 'noShow', 'attended');
    renderAt('18:30:00');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We couldn’t send that. Try again in a moment.',
    );
    expect(screen.getByRole('form', { name: 'What happened?' })).toBeVisible();
  });

  it('never for the person who turned up, nor when neither did', () => {
    h.room = settled('mentee', 'noShow', 'attended', 'noShow');
    const view = renderAt('18:30:00');
    expect(screen.queryByRole('form', { name: 'What happened?' })).toBeNull();
    view.unmount();
    h.room = settled('mentee', 'noShow', 'noShow', 'noShow');
    renderAt('18:30:00');
    expect(screen.queryByRole('form', { name: 'What happened?' })).toBeNull();
  });

  it('a mentor who missed it is asked too', () => {
    h.viewer = { ...MENTEE, isMentee: false, isApprovedMentor: true, isMentor: true };
    h.room = settled('mentor', 'noShow', 'noShow', 'attended');
    renderAt('18:30:00');
    expect(screen.getByRole('form', { name: 'What happened?' })).toBeVisible();
  });
});
