import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Booking } from '@/types/booking';
import type { AppError } from '@/types/mentor';
import { NextSessionCard } from './NextSessionCard';

const ZONE = 'Africa/Lagos';
const iso = (ms: number) => new Date(ms).toISOString();

function booking(over: Partial<Booking> = {}): Booking {
  const start = Date.now() + 8 * 864e5;
  return {
    id: 's1',
    status: 'confirmed',
    side: 'mentor',
    other: { name: 'Amara Okafor' },
    title: 'SOP review',
    startsAt: iso(start),
    endsAt: iso(start + 36e5),
    durationMin: 60,
    joinOpensAt: iso(start - 6e5),
    joinClosesAt: iso(start + 36e5),
    doorClosesAt: null,
    myJoinedAt: null,
    ...over,
  } as unknown as Booking;
}

const base = { onRetry: () => {}, timeZone: ZONE, now: new Date() };

describe('NextSessionCard', () => {
  it('loading: announces, and shows neither empty nor content', () => {
    render(<NextSessionCard {...base} isLoading error={null} booking={null} />);
    expect(screen.getByText('Loading your next session')).toBeInTheDocument();
    expect(screen.queryByText('No upcoming sessions')).not.toBeInTheDocument();
  });

  it('error is shown before empty, with a retry', async () => {
    const onRetry = vi.fn();
    render(
      <NextSessionCard {...base} onRetry={onRetry} isLoading={false} error={{} as AppError} booking={null} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('couldn’t load');
    expect(screen.queryByText('No upcoming sessions')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('empty: points the mentor at their availability', () => {
    render(<NextSessionCard {...base} isLoading={false} error={null} booking={null} />);
    expect(screen.getByText('No upcoming sessions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Update availability' })).toHaveAttribute(
      'href',
      '/calendar',
    );
  });

  it('content: shows the session and mentee; a far session links to details, not Join', () => {
    const now = new Date();
    render(
      <NextSessionCard {...base} now={now} isLoading={false} error={null} booking={booking()} />,
    );
    const region = screen.getByRole('region', { name: 'Next session' });
    expect(region).toHaveTextContent('SOP review');
    expect(region).toHaveTextContent('Amara Okafor');
    // 8 days out → still ahead of the join window: details, not a Join that
    // cannot work yet.
    expect(screen.queryByRole('link', { name: 'Join session' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View session details' })).toHaveAttribute(
      'href',
      '/sessions/s1',
    );
  });

  it('content: a session whose join window is open shows Join, not the details link', () => {
    const now = new Date();
    // joinOpensAt in the past, start five minutes out → the join window is open.
    const soon = Date.now() + 5 * 60_000;
    render(
      <NextSessionCard
        {...base}
        now={now}
        isLoading={false}
        error={null}
        booking={booking({
          startsAt: iso(soon),
          endsAt: iso(soon + 36e5),
          joinOpensAt: iso(Date.now() - 6e5),
          joinClosesAt: iso(soon + 36e5),
        })}
      />,
    );
    expect(screen.getByRole('link', { name: 'Join session' })).toHaveAttribute(
      'href',
      '/sessions/s1',
    );
    expect(screen.queryByRole('link', { name: 'View session details' })).not.toBeInTheDocument();
  });
  // #255: outside the join window the card still leads to the session page.
  it.each([
    [
      'running, past the join window',
      { start: -20 * 60_000, opens: -30 * 60_000, closes: -5 * 60_000, end: 40 * 60_000 },
    ],
    [
      'just ended, attendance not settled',
      { start: -65 * 60_000, opens: -75 * 60_000, closes: -50 * 60_000, end: -5 * 60_000 },
    ],
  ])('content: %s links to details', (_name, t) => {
    const at = (d: number) => iso(Date.now() + d);
    render(
      <NextSessionCard
        {...base}
        now={new Date()}
        isLoading={false}
        error={null}
        booking={booking({
          startsAt: at(t.start),
          endsAt: at(t.end),
          joinOpensAt: at(t.opens),
          joinClosesAt: at(t.closes),
        })}
      />,
    );
    expect(screen.queryByRole('link', { name: 'Join session' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View session details' })).toHaveAttribute(
      'href',
      '/sessions/s1',
    );
  });
});
