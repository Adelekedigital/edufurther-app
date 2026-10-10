import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { BookingStatus } from '@/types/booking';
import { BookingDetails } from './BookingDetails';

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

const panel = (props: Partial<Parameters<typeof BookingDetails>[0]> = {}) =>
  render(
    <BookingDetails
      booking={sampleBookingFor({ startsAt: at(26), endsAt: at(27) })}
      timeZone="America/New_York"
      titleId="t"
      onClose={vi.fn()}
      now={NOW}
      {...props}
    />,
  );

describe('what the panel says', () => {
  it('names the other party and how reliable they are', () => {
    panel({ booking: sampleBookingFor({ menteeAttendanceRate: 92 }) });
    expect(screen.getByText('Amara Okafor')).toBeVisible();
    expect(screen.getByText('Attendance rate: 92%')).toBeVisible();
  });

  it('says only "Mentee" with no attendance data — never 0%', () => {
    panel({ booking: sampleBookingFor({ menteeAttendanceRate: null }) });
    expect(screen.getByText('Mentee')).toBeVisible();
    expect(screen.queryByText(/0%/)).not.toBeInTheDocument();
  });

  it('reads times in the viewer’s zone and names it', () => {
    panel();
    expect(screen.getByText(/New York/)).toBeVisible();
  });

  it('leaves out blocks it has nothing for, rather than showing them empty', () => {
    panel({ booking: sampleBookingFor({ title: null, note: null }) });
    expect(screen.queryByText('Session')).not.toBeInTheDocument();
    expect(screen.queryByText(/Notes from/)).not.toBeInTheDocument();
  });

  it('the note is labelled by whose it is', () => {
    panel({ booking: sampleBookingFor({ note: 'Nine programs.' }), answers: [] });
    expect(screen.getByText('Note from Amara')).toBeVisible();
    panel({ booking: sampleBookingFor({ note: 'Nine programs.', side: 'mentee' }), answers: [] });
    expect(screen.getByText('Your note')).toBeVisible();
  });

  it('a mentor is told what to do and by when', () => {
    panel({ booking: sampleBookingFor({ status: 'pending', respondBy: at(5) }) });
    expect(screen.getByText('Respond within 5h')).toBeVisible();
  });

  it('a mentee is never told to respond to a request only their mentor can answer', () => {
    panel({ booking: sampleBookingFor({ status: 'pending', side: 'mentee', respondBy: at(40) }) });
    expect(screen.getByText('Waiting for Amara to confirm')).toBeVisible();
    expect(screen.queryByText(/Respond within/)).not.toBeInTheDocument();
  });

  it('close to the deadline, the mentee sees how long is left', () => {
    panel({ booking: sampleBookingFor({ status: 'pending', side: 'mentee', respondBy: at(18) }) });
    expect(screen.getByText('Amara has 18h left to confirm')).toBeVisible();
  });

  it('a lapsed request says so instead of counting down', () => {
    panel({ booking: sampleBookingFor({ status: 'pending', respondBy: at(-1) }) });
    expect(screen.getByText('Expired')).toBeVisible();
    expect(screen.queryByText(/Respond within/)).not.toBeInTheDocument();
  });
});

describe('why it ended', () => {
  const cancelled = sampleBookingFor({ status: 'cancelled', startsAt: at(-300), endsAt: at(-299) });

  it('names who did it and quotes what they wrote', () => {
    panel({
      booking: cancelled,
      outcome: { status: 'cancelled', reason: 'Conference clash.', by: 'them', at: at(-320) },
    });
    expect(screen.getByText('Amara cancelled this session')).toBeVisible();
    expect(screen.getByText('“Conference clash.”')).toBeVisible();
  });

  it('addresses the viewer when it was them', () => {
    panel({ booking: cancelled, outcome: { status: 'cancelled', reason: null, by: 'you', at: at(-320) } });
    expect(screen.getByText('You cancelled this session')).toBeVisible();
  });

  it('with no reason written, the heading stands alone — no empty quote', () => {
    panel({ booking: cancelled, outcome: { status: 'cancelled', reason: null, by: 'them', at: at(-320) } });
    expect(screen.getByText('Amara cancelled this session')).toBeVisible();
    expect(screen.queryByText('“”')).not.toBeInTheDocument();
  });

  it('a sweep is nobody, so nobody is blamed', () => {
    panel({
      booking: sampleBookingFor({ status: 'expired', startsAt: at(-300), endsAt: at(-299) }),
      outcome: { status: 'expired', reason: null, by: 'system', at: at(-320) },
    });
    expect(screen.getByText('Nobody answered in time')).toBeVisible();
  });

  it('renders nothing at all when there is no outcome to explain', () => {
    panel({ booking: cancelled });
    expect(screen.queryByText(/cancelled this session/)).not.toBeInTheDocument();
  });
});

describe('the footer', () => {
  it('says when Join opens before the window, with Join locked', () => {
    panel({
      booking: sampleBookingFor({
        startsAt: at(0.5),
        endsAt: at(1.5),
        joinOpensAt: at(0.4),
        joinClosesAt: at(0.75),
      }),
      joinHref: '/sessions/b1',
    });
    expect(screen.getByRole('button', { name: 'Join session' })).toBeDisabled();
    expect(screen.getByText(/Join opens \d+ minutes before/)).toBeVisible();
  });

  it('has no footer where there is nothing to do yet', () => {
    panel({ booking: sampleBookingFor({ status: 'completed' }) });
    expect(screen.queryByRole('button', { name: 'Join session' })).not.toBeInTheDocument();
  });

  it('never offers a Join that can only fail', () => {
    panel({
      booking: sampleBookingFor({ joinOpensAt: at(-3), joinClosesAt: at(-2) }),
      joinHref: '/sessions/b1',
    });
    expect(screen.queryByRole('button', { name: 'Join session' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Join session' })).not.toBeInTheDocument();
  });

  it('inside the window Join is a link to the session’s own page', () => {
    panel({
      booking: sampleBookingFor({
        startsAt: at(-0.05),
        endsAt: at(1),
        joinOpensAt: at(-0.2),
        joinClosesAt: at(0.3),
      }),
      joinHref: '/sessions/b1',
    });
    expect(screen.getByRole('link', { name: 'Join session' })).toHaveAttribute(
      'href',
      '/sessions/b1',
    );
  });
});

describe('closing', () => {
  it('the close button is named, and calls back', async () => {
    const onClose = vi.fn();
    panel({ onClose });
    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('a deleted account', () => {
  it('keeps the session but loses the person, with no second time line', () => {
    panel({
      booking: sampleBookingFor({
        status: 'completed',
        other: sampleParty({
          name: 'Deleted user',
          firstName: 'Deleted user',
          initials: '',
          deleted: true,
          timeZone: null,
        }),
      }),
    });
    expect(screen.getByText('Deleted user')).toBeVisible();
    expect(screen.queryByText(/ for Deleted user in /)).not.toBeInTheDocument();
  });
});

describe('when the reason cannot be loaded', () => {
  const cancelled = sampleBookingFor({ status: 'cancelled', startsAt: at(-300), endsAt: at(-299) });

  it('says so, instead of reading as "nobody wrote one"', async () => {
    const retryOutcome = vi.fn();
    panel({ booking: cancelled, outcomeFailed: true, retryOutcome });
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load why this ended.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retryOutcome).toHaveBeenCalled();
  });

  it('stays quiet once the reason has arrived', () => {
    panel({
      booking: cancelled,
      outcomeFailed: true,
      outcome: { status: 'cancelled', reason: 'Clash.', by: 'them', at: at(-320) },
    });
    expect(screen.queryByText('We couldn’t load why this ended.')).not.toBeInTheDocument();
  });
});

describe('a sweep has no name', () => {
  it.each([
    ['cancelled', 'This session was cancelled'],
    ['declined', 'This request was declined'],
    ['withdrawn', 'This request was withdrawn'],
  ] as const)('%s reads passively, not "this session cancelled this session"', (status, heading) => {
    panel({
      booking: sampleBookingFor({ status, startsAt: at(-300), endsAt: at(-299) }),
      outcome: { status, reason: null, by: 'system', at: at(-320) },
    });
    expect(screen.getByText(heading)).toBeVisible();
  });
});

describe('the reason is still loading', () => {
  it('claims neither a reason nor a failure while it is still coming', () => {
    panel({
      booking: sampleBookingFor({ status: 'cancelled', startsAt: at(-300), endsAt: at(-299) }),
      outcomeLoading: true,
      outcomeFailed: true,
    });
    expect(screen.queryByText('We couldn’t load why this ended.')).not.toBeInTheDocument();
    expect(screen.queryByText(/cancelled this session/)).not.toBeInTheDocument();
  });
});

describe('the booking form answers', () => {
  const answer = (i: number) => ({
    questionId: `q${i}`,
    question: `Question ${i}?`,
    kind: 'free_text' as const,
    retired: false,
    answered: true,
    required: null,
    text: `Answer ${i}.`,
    file: null,
  });
  const six = [1, 2, 3, 4, 5, 6].map(answer);

  it('shows two, then offers the rest by count', () => {
    panel({ answers: six, onToggleAnswers: vi.fn() });
    expect(screen.getByText('Answer 1.')).toBeVisible();
    expect(screen.getByText('Answer 2.')).toBeVisible();
    expect(screen.queryByText('Answer 3.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all 6 questions' })).toBeVisible();
  });

  it('two or fewer need no disclosure at all', () => {
    panel({ answers: [answer(1), answer(2)], onToggleAnswers: vi.fn() });
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();
  });

  it('the disclosure says what it does and what it controls', () => {
    panel({ answers: six, onToggleAnswers: vi.fn() });
    const button = screen.getByRole('button', { name: 'Show all 6 questions' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'booking-answers');
  });

  it('expanded, it shows all of them and offers the way back', () => {
    panel({ answers: six, answersExpanded: true, onToggleAnswers: vi.fn() });
    expect(screen.getByText('Answer 6.')).toBeVisible();
    const button = screen.getByRole('button', { name: 'Show less' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('is titled by whose answers they are', () => {
    panel({ answers: [answer(1)] });
    expect(screen.getByRole('heading', { name: 'Answers from Amara' })).toBeVisible();
    panel({ booking: sampleBookingFor({ side: 'mentee' }), answers: [answer(1)] });
    expect(screen.getByRole('heading', { name: 'Your answers' })).toBeVisible();
  });

  it('a failure is said plainly, with a way to try again — and before any empty state', () => {
    const retryAnswers = vi.fn();
    panel({ answers: null, answersFailed: true, retryAnswers });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load the answers.');
    // Never the server's own words (RFC 9457 `detail`).
    expect(alert).not.toHaveTextContent(/detail|500|Internal/i);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it('while loading it shows a shape, not a heading with nothing under it', () => {
    panel({ answers: null, answersLoading: true });
    expect(screen.queryByRole('heading', { name: /Answers from/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a booking with no form renders no empty heading', () => {
    panel({ answers: [] });
    expect(screen.queryByRole('heading', { name: /Answers from|Your answers/ })).not.toBeInTheDocument();
  });

  it('the answers and the note are both kept — they are different fields', () => {
    panel({ booking: sampleBookingFor({ note: 'Nine programs.' }), answers: [answer(1)] });
    expect(screen.getByRole('heading', { name: 'Answers from Amara' })).toBeVisible();
    expect(screen.getByText('Note from Amara')).toBeVisible();
    expect(screen.getByText('Nine programs.')).toBeVisible();
  });
});

describe('what happened, and why (design’s table, 2026-10-03)', () => {
  const AT = '2026-10-02T09:00:00Z';
  const ended = (status: BookingStatus, side: 'mentor' | 'mentee', reason?: string) => ({
    booking: sampleBookingFor({ status, side }),
    outcome: {
      status,
      by: side === 'mentee' ? ('them' as const) : ('you' as const),
      reason: reason ?? null,
      at: AT,
    },
  });

  it('a mentee is told where the credit went', () => {
    panel(ended('declined', 'mentee'));
    expect(screen.getByText(/declined this request/i)).toBeVisible();
    expect(screen.getByText('Your credit is back.')).toBeVisible();
  });

  it('a mentor is never told about credit — it is not theirs', () => {
    panel({ ...ended('declined', 'mentor'), outcome: { status: 'declined', by: 'you', reason: null, at: AT } });
    expect(screen.queryByText(/credit/i)).not.toBeInTheDocument();
  });

  it('a system sweep never says "you" did it', () => {
    // The heading owns who did what, and it reads `o.by`. Keying a second
    // sentence off the viewer's side told a mentor "You declined this request"
    // when the hourly sweep had.
    panel({ ...ended('declined', 'mentor'), outcome: { status: 'declined', by: 'system', reason: null, at: AT } });
    expect(screen.queryByText(/^You declined/)).not.toBeInTheDocument();
  });

  it('what happened is said once, not twice', () => {
    panel({ ...ended('withdrawn', 'mentee'), outcome: { status: 'withdrawn', by: 'you', reason: null, at: AT } });
    expect(screen.getAllByText(/withdrew this request/i)).toHaveLength(1);
  });

  it('a late cancellation records where the credit went, since the dialog is long gone', () => {
    panel({
      booking: sampleBookingFor({ side: 'mentee', status: 'cancelled', startsAt: at(9), endsAt: at(10) }),
      // Cancelled an hour ago, for a session nine hours away: inside the
      // window. The fixture used to record the cancellation eight days before
      // the session and still expect "too late" — it only passed because the
      // old code judged it against the clock rather than the event.
      outcome: { status: 'cancelled', by: 'you', reason: null, at: at(-1) },
    });
    expect(screen.getByText(/less than 12 hours before the session, so the credit was not returned/)).toBeVisible();
  });

  it('a cancellation in good time says the credit came back', () => {
    panel({
      booking: sampleBookingFor({ side: 'mentee', status: 'cancelled', startsAt: at(48), endsAt: at(49) }),
      outcome: { status: 'cancelled', by: 'you', reason: null, at: AT },
    });
    expect(screen.getByText('Your credit is back.')).toBeVisible();
  });

  it('a reason is headed so it cannot be mistaken for the booking note', () => {
    panel({ ...ended('cancelled', 'mentee', 'Something came up.'), 
      outcome: { status: 'cancelled', by: 'them', reason: 'Something came up.', at: AT } });
    expect(screen.getByText('Reason from Amara')).toBeVisible();
    expect(screen.getByText('“Something came up.”')).toBeVisible();
  });

  it('no reason given means no block at all — never "No reason given"', () => {
    panel({ ...ended('cancelled', 'mentee'), outcome: { status: 'cancelled', by: 'them', reason: null, at: AT } });
    expect(screen.queryByText(/Reason from/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No reason/i)).not.toBeInTheDocument();
  });
});

const AT2 = '2026-10-02T09:00:00Z';

describe('a missed session says who was there', () => {
  const missed = (mine: string, theirs: string) => ({
    booking: sampleBookingFor({
      status: 'noShow',
      side: 'mentee',
      myAttendance: mine as 'pending',
      other: sampleParty({ attendance: theirs as 'pending' }),
    }),
    outcome: { status: 'noShow' as const, by: 'system' as const, reason: null, at: AT2 },
  });

  it('neither of them', () => {
    panel(missed('noShow', 'noShow'));
    expect(screen.getByText('Neither of you joined this session')).toBeVisible();
  });

  it('they were there, you were not', () => {
    panel(missed('noShow', 'attended'));
    expect(screen.getByText('You didn’t join this session')).toBeVisible();
  });

  it('you were there, they were not — leaving early still counts as being there', () => {
    panel(missed('leftEarly', 'noShow'));
    expect(screen.getByText('Amara didn’t join this session')).toBeVisible();
  });

  it('a migrated booking with no record says the plain thing, not "neither of you"', () => {
    // `pending` is unknown, never absence. Claiming nobody came would accuse
    // people of missing a session they attended.
    panel(missed('pending', 'pending'));
    expect(screen.getByText('This session was missed')).toBeVisible();
  });
});

describe('who the other person is, in the panel', () => {
  it('shows the degree line above the role', () => {
    panel({
      booking: sampleBookingFor({
        side: 'mentor',
        other: sampleParty({ degree: 'BSc', institution: 'Federal University of Technology, Akure' }),
      }),
    });
    expect(screen.getByText('BSc at Federal University of Technology, Akure')).toBeVisible();
  });

  it('renders no empty line when there is no education entry', () => {
    const { container } = panel({
      booking: sampleBookingFor({ side: 'mentor', other: sampleParty({ degree: null, institution: null }) }),
    });
    // An empty label would still take a row and read as something missing.
    expect([...container.querySelectorAll('span')].some((s) => s.textContent === '')).toBe(false);
  });

  it('the attendance line carries its denominator', () => {
    panel({
      booking: sampleBookingFor({
        side: 'mentor',
        menteeAttendanceRate: 92,
        menteeAttendanceSessions: 25,
      }),
    });
    expect(screen.getByText('Attendance rate: 92% (25 sessions)')).toBeVisible();
  });
});

describe('a past cancellation is judged by when it happened', () => {
  const cancelled = (startsAt: string, cancelledAt: string) => ({
    booking: sampleBookingFor({
      side: 'mentee',
      status: 'cancelled',
      startsAt,
      endsAt: startsAt,
      refundUntil: null,
    }),
    outcome: { status: 'cancelled' as const, by: 'you' as const, reason: null, at: cancelledAt },
  });

  it('a mentee who cancelled in good time is told the credit came back', () => {
    // The session was last week; they cancelled three days before it. Judged
    // against today's clock this always reads as "too late", which told every
    // mentee with an old row that their credit had not come back.
    panel(cancelled(at(-168), at(-240)));
    expect(screen.getByText('Your credit is back.')).toBeVisible();
  });

  it('a mentee who cancelled too late is still told so', () => {
    panel(cancelled(at(-168), at(-169)));
    expect(screen.getByText(/so the credit was not returned/)).toBeVisible();
  });

  it('an unparseable outcome time falls back rather than throwing', () => {
    panel({
      booking: sampleBookingFor({ side: 'mentee', status: 'cancelled', startsAt: at(48), endsAt: at(49) }),
      outcome: { status: 'cancelled', by: 'you', reason: null, at: 'not-a-date' },
    });
    expect(screen.getByText('Your credit is back.')).toBeVisible();
  });
});

describe('questions the mentee left blank (backend #412)', () => {
  const q = (i: number, over = {}) => ({
    questionId: `q${i}`,
    question: `Question ${i}?`,
    kind: 'free_text' as const,
    retired: false,
    answered: true,
    required: null,
    text: `Answer ${i}.`,
    file: null,
    ...over,
  });
  const blank = (i: number) => q(i, { answered: false, text: '' });

  it('the toggle counts questions, never promising answers that do not exist', () => {
    // Seven asked, three answered. "Show all 7 answers" was a claim the panel
    // could not keep: expanding showed three answers and four blanks.
    const mixed = [q(1), q(2), q(3), blank(4), blank(5), blank(6), blank(7)];
    panel({ answers: mixed, onToggleAnswers: vi.fn() });
    expect(screen.getByRole('button', { name: 'Show all 7 questions' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /7 answers/ })).not.toBeInTheDocument();
  });

  it('the collapsed preview shows answers, not the blanks that came first', () => {
    // The mentee skipped the opening two questions and wrote at length on the
    // third. In form order the preview was two "No answer" rows, reading as
    // "they told us nothing" with the content hidden behind the toggle.
    panel({ answers: [blank(1), blank(2), q(3), q(4)], onToggleAnswers: vi.fn() });
    expect(screen.getByText('Answer 3.')).toBeVisible();
    expect(screen.getByText('Answer 4.')).toBeVisible();
    expect(screen.queryByText('No answer')).not.toBeInTheDocument();
  });

  it('expanded, it is the record: every question in form order, blanks included', () => {
    panel({ answers: [blank(1), blank(2), q(3), q(4)], answersExpanded: true, onToggleAnswers: vi.fn() });
    expect(screen.getAllByText('No answer')).toHaveLength(2);
    expect(screen.getByText('Question 1?')).toBeVisible();
    expect(screen.getByText('Answer 3.')).toBeVisible();
  });

  it('a form answered by nobody says so instead of showing an empty block', () => {
    panel({ answers: [blank(1), blank(2), blank(3)], onToggleAnswers: vi.fn() });
    expect(screen.getByText(/didn’t answer any of the questions/)).toBeVisible();
    // And the questions asked are still reachable.
    expect(screen.getByRole('button', { name: 'Show all 3 questions' })).toBeVisible();
  });

  it('a mentee reading their own blank form is addressed directly', () => {
    panel({
      booking: sampleBookingFor({ side: 'mentee', startsAt: at(26), endsAt: at(27) }),
      answers: [blank(1)],
      onToggleAnswers: vi.fn(),
    });
    expect(screen.getByText('You didn’t answer the questions on this form.')).toBeVisible();
  });

  it('a booking from before the form was kept is unchanged', () => {
    // Those list only their answers, every one `answered: true`.
    panel({ answers: [q(1), q(2), q(3)], onToggleAnswers: vi.fn() });
    expect(screen.getByText('Answer 1.')).toBeVisible();
    expect(screen.queryByText('No answer')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all 3 questions' })).toBeVisible();
  });
});
