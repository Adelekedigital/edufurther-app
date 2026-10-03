import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
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

  it('labels the note by whose it is', () => {
    panel({ booking: sampleBookingFor({ note: 'Nine programs.' }) });
    expect(screen.getByText('Notes from Amara')).toBeVisible();
    panel({ booking: sampleBookingFor({ note: 'Nine programs.', side: 'mentee' }) });
    expect(screen.getByText('What you asked for')).toBeVisible();
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
    expect(screen.getByText('Unconfirmed')).toBeVisible();
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
  it('offers Join inside the window, and says when it opens before that', async () => {
    const onJoin = vi.fn();
    panel({
      booking: sampleBookingFor({
        startsAt: at(0.5),
        endsAt: at(1.5),
        joinOpensAt: at(0.4),
        joinClosesAt: at(0.75),
      }),
      onJoin,
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
      onJoin: vi.fn(),
    });
    expect(screen.queryByRole('button', { name: 'Join session' })).not.toBeInTheDocument();
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
