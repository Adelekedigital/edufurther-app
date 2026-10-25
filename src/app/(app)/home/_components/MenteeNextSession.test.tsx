import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Booking, BookingParty } from '@/types/booking';
import { MenteeNextSession } from './MenteeNextSession';

const NOW = new Date('2026-10-13T12:00:00Z');
const at = (min: number) => new Date(NOW.getTime() + min * 60_000).toISOString();

const party = (): BookingParty => ({
  id: 'p1',
  name: 'Olajuwon Samuel',
  firstName: 'Olajuwon',
  initials: 'OS',
  avatarUrl: null,
  avatarFocus: null,
  deleted: false,
  timeZone: 'Africa/Lagos',
  cover: 'sand',
  degree: null,
  institution: null,
  joinedAt: null,
  inRoomAt: null,
  inRoom: null,
  attendance: 'pending',
});

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  status: 'confirmed',
  side: 'mentee',
  other: party(),
  myAttendance: 'pending',
  myJoinedAt: null,
  startsAt: at(60 * 24 * 5), // five days out
  endsAt: at(60 * 24 * 5 + 45),
  durationMin: 45,
  title: 'Scholarship strategy call',
  note: null,
  answersPreview: null,
  suggestion: null,
  sessionTypeId: 'st1',
  createdAt: at(-60 * 240),
  respondBy: null,
  joinOpensAt: at(60 * 24 * 5 - 5),
  joinClosesAt: at(60 * 24 * 5 + 15),
  doorClosesAt: null,
  refundUntil: null,
  menteeAttendanceRate: null,
  menteeAttendanceSessions: 0,
  ...over,
});

describe('MenteeNextSession', () => {
  it('a far-off session offers View details, not Join', () => {
    render(<MenteeNextSession booking={booking()} timeZone="Africa/Lagos" now={NOW} />);
    const details = screen.getByRole('link', { name: 'View details' });
    expect(details).toHaveAttribute('href', '/bookings?booking=b1');
    expect(screen.queryByText('Join session')).not.toBeInTheDocument();
  });

  it('an imminent session shows the live badge and routes to the session page', () => {
    const b = booking({ startsAt: at(8), endsAt: at(53), joinOpensAt: at(3), joinClosesAt: at(23) });
    render(<MenteeNextSession booking={b} timeZone="Africa/Lagos" now={NOW} />);
    expect(screen.getByRole('link', { name: 'Join session' })).toHaveAttribute(
      'href',
      '/sessions/b1',
    );
    expect(screen.getByText(/Starts in 8 min/)).toBeInTheDocument();
  });

  it('a closed join window falls back to View details, not a Join that can only fail', () => {
    // Started 30 min ago and the join window shut 5 min ago, but the backend still
    // lists it confirmed (useUpcomingBookings keeps just-settled rows).
    const b = booking({
      startsAt: at(-30),
      endsAt: at(15),
      joinOpensAt: at(-35),
      joinClosesAt: at(-5),
    });
    render(<MenteeNextSession booking={b} timeZone="Africa/Lagos" now={NOW} />);
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      '/bookings?booking=b1',
    );
    expect(screen.queryByText('Join session')).not.toBeInTheDocument();
  });

  it('gives the full date to assistive tech (the chip is decorative)', () => {
    render(<MenteeNextSession booking={booking()} timeZone="Africa/Lagos" now={NOW} />);
    expect(screen.getByText('October 18, 2026')).toBeInTheDocument();
  });

  it('the prep checklist opens and items toggle, updating the count', async () => {
    render(<MenteeNextSession booking={booking()} timeZone="Africa/Lagos" now={NOW} />);
    const toggle = screen.getByRole('button', { name: /Before your session · 0 of 3/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const first = screen.getByRole('button', { name: /Re-read what you shared/ });
    expect(first).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Before your session · 1 of 3/ })).toBeInTheDocument();
  });
});
