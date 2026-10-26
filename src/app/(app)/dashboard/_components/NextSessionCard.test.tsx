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
      <NextSessionCard
        {...base}
        onRetry={onRetry}
        isLoading={false}
        error={{} as AppError}
        booking={null}
      />,
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

  it('content: shows the session and mentee; a far session already offers Join', () => {
    const now = new Date();
    render(
      <NextSessionCard {...base} now={now} isLoading={false} error={null} booking={booking()} />,
    );
    const region = screen.getByRole('region', { name: 'Next session' });
    expect(region).toHaveTextContent('SOP review');
    expect(region).toHaveTextContent('Amara Okafor');
    // 8 days out: Join opens the session page, which counts down (owner, 26 Oct).
    expect(screen.getByRole('link', { name: 'Join session' })).toHaveAttribute(
      'href',
      '/sessions/s1',
    );
    expect(screen.queryByRole('link', { name: 'View session details' })).not.toBeInTheDocument();
  });

  // Every phase leads to the session page with the same enabled Join.
  it.each([
    [
      'inside the join window',
      { start: 5 * 60_000, opens: -10 * 60_000, closes: 20 * 60_000, end: 65 * 60_000 },
    ],
    [
      'running, past the join window',
      { start: -20 * 60_000, opens: -30 * 60_000, closes: -5 * 60_000, end: 40 * 60_000 },
    ],
  ])('content: %s shows Join', (_name, t) => {
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
    expect(screen.getByRole('link', { name: 'Join session' })).toHaveAttribute(
      'href',
      '/sessions/s1',
    );
    expect(screen.queryByRole('button', { name: 'Join session' })).not.toBeInTheDocument();
  });
});
