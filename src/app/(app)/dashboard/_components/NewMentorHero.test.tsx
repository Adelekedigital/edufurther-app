import { render, screen, within } from '@testing-library/react';
import type { Booking } from '@/types/booking';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { AppError } from '@/types/mentor';
import { NewMentorHero } from './NewMentorHero';

const ZONE = 'Africa/Lagos';
const fail: AppError = { status: 500, message: 'Server error' } as AppError;
const remote = <T,>(data: T | null, error: AppError | null = null) => ({
  data,
  isLoading: data === null && !error,
  error,
  retry: vi.fn(),
});

let openTimes = remote<number>(6);
let pending = remote<Booking[]>([]);
vi.mock('@/lib/api/data/openTimes', () => ({ useOpenTimesCount: () => openTimes }));
vi.mock('@/lib/api/data/bookings', () => ({ usePendingBookings: () => pending }));

const iso = (ms: number) => new Date(ms).toISOString();
function booking(over: Partial<Booking> = {}): Booking {
  const start = Date.now() + 6 * 864e5;
  return sampleBookingFor({
    id: 's1',
    other: sampleParty({ name: 'Ada Okafor' }),
    title: 'Intro chat',
    startsAt: iso(start),
    endsAt: iso(start + 18e5),
    durationMin: 30,
    joinOpensAt: iso(start - 6e5),
    joinClosesAt: iso(start + 18e5),
    ...over,
  });
}

const base = {
  mentorId: 'm1',
  timeZone: ZONE,
  profileHref: '/mentors/gbenga',
  // 23:30 UTC on Oct 17 is already Oct 18 in Lagos (UTC+1).
  approvedAt: '2026-10-17T23:30:00Z',
  nextSession: remote<Booking | null>(null),
  upcomingCount: 0,
  now: new Date(),
  movesDone: [] as const,
  onMove: vi.fn(),
  onCopyLink: vi.fn(),
};

beforeEach(() => {
  openTimes = remote<number>(6);
  pending = remote<Booking[]>([]);
});

describe('NewMentorHero, noBookings', () => {
  it('is labelled by its eyebrow and says the mentor is live', () => {
    render(<NewMentorHero {...base} stage="noBookings" />);
    const hero = screen.getByRole('region', { name: 'Get your first booking' });
    expect(
      within(hero).getByRole('heading', { name: 'You’re live. Let’s get your first booking.' }),
    ).toBeInTheDocument();
  });

  it('three status rows: listed since the approval day in the account zone, open times, requests', () => {
    render(<NewMentorHero {...base} stage="noBookings" />);
    expect(screen.getByRole('link', { name: 'Listed on Explore: Since Oct 18' })).toHaveAttribute(
      'href',
      '/mentors/gbenga',
    );
    expect(screen.getByRole('link', { name: 'Available times, next 14 days: 6' })).toHaveAttribute(
      'href',
      '/calendar',
    );
    expect(screen.getByRole('link', { name: 'Booking requests: None yet' })).toHaveAttribute(
      'href',
      '/bookings?tab=pending',
    );
  });

  it('counts only requests the mentor has to answer', () => {
    pending = remote<Booking[]>([
      booking({ id: 'a', status: 'pending' }),
      booking({ id: 'b', status: 'pending', side: 'mentee' }),
    ]);
    render(<NewMentorHero {...base} stage="noBookings" />);
    expect(screen.getByRole('link', { name: 'Booking requests: 1' })).toBeInTheDocument();
  });

  it('no approval date known: still listed, without a date', () => {
    render(<NewMentorHero {...base} approvedAt={null} stage="noBookings" />);
    expect(screen.getByRole('link', { name: 'Listed on Explore: Live now' })).toBeInTheDocument();
  });

  it('a row that fails says so and still links; the other rows are unaffected', () => {
    openTimes = remote<number>(null, fail);
    render(<NewMentorHero {...base} stage="noBookings" />);
    expect(
      screen.getByRole('link', { name: 'Available times, next 14 days: Couldn’t load' }),
    ).toHaveAttribute('href', '/calendar');
    expect(screen.getByRole('link', { name: 'Booking requests: None yet' })).toBeInTheDocument();
  });

  it('a row still loading shows a loading value', () => {
    openTimes = remote<number>(null);
    render(<NewMentorHero {...base} stage="noBookings" />);
    expect(
      screen.getByRole('link', { name: /Available times, next 14 days: Loading/ }),
    ).toBeInTheDocument();
  });

  it('shows no booking card', () => {
    render(<NewMentorHero {...base} stage="noBookings" />);
    expect(screen.queryByRole('heading', { name: 'Next session' })).not.toBeInTheDocument();
  });
});

describe('NewMentorHero, firstBooked', () => {
  const booked = { ...base, nextSession: remote<Booking | null>(booking()), upcomingCount: 1 };

  it('leads with the booking card, its first-booking line and Join', () => {
    render(<NewMentorHero {...booked} stage="firstBooked" />);
    const hero = screen.getByRole('region', { name: 'Your first session' });
    expect(
      within(hero).getByRole('heading', { name: 'Your first session is booked.' }),
    ).toBeInTheDocument();
    expect(within(hero).getByRole('heading', { name: 'Next session' })).toBeInTheDocument();
    expect(within(hero).getByText('In 6 days · Your first booking')).toBeInTheDocument();
    // Outside the join window, Join still opens the session page (owner, 26 Oct).
    expect(within(hero).getByRole('link', { name: 'Join session' })).toBeInTheDocument();
    expect(
      within(hero).queryByRole('link', { name: 'View session details' }),
    ).not.toBeInTheDocument();
    expect(within(hero).getByRole('link', { name: 'All bookings' })).toHaveAttribute(
      'href',
      '/bookings',
    );
    expect(screen.queryByRole('button', { name: /Send a message/ })).not.toBeInTheDocument();
  });

  it('inside the join window the card shows Join session', () => {
    const soon = Date.now() + 5 * 6e4;
    const live = booking({
      startsAt: iso(soon),
      endsAt: iso(soon + 18e5),
      joinOpensAt: iso(Date.now() - 6e4),
      joinClosesAt: iso(soon + 18e5),
    });
    render(
      <NewMentorHero {...booked} nextSession={remote<Booking | null>(live)} stage="firstBooked" />,
    );
    expect(screen.getByRole('link', { name: 'Join session' })).toBeInTheDocument();
  });

  it('upcoming sessions replaces booking requests', () => {
    render(<NewMentorHero {...booked} stage="firstBooked" />);
    expect(screen.getByRole('link', { name: 'Upcoming sessions: 1' })).toHaveAttribute(
      'href',
      '/bookings',
    );
    expect(screen.queryByRole('link', { name: /Booking requests/ })).not.toBeInTheDocument();
  });
});

describe('NewMentorHero, Do this week', () => {
  it('noBookings: three moves with a counter', () => {
    render(<NewMentorHero {...base} movesDone={['about']} stage="noBookings" />);
    expect(screen.getByRole('heading', { name: 'Do this week' })).toBeInTheDocument();
    expect(screen.getByText('1 of 3 done')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add hours' })).toHaveAttribute('href', '/calendar');
    // Edit About is done this week: its button gives way to the mark.
    expect(screen.queryByRole('link', { name: 'Edit About' })).toBeNull();
    expect(screen.getByText('Done this week')).toBeInTheDocument();
  });

  it('firstBooked: only the Hours move, with no counter', () => {
    const booked = { ...base, nextSession: remote<Booking | null>(booking()), upcomingCount: 1 };
    render(<NewMentorHero {...booked} stage="firstBooked" />);
    expect(screen.getByRole('link', { name: 'Add hours' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Edit About' })).toBeNull();
    expect(screen.queryByText(/of \d done/)).toBeNull();
  });
});
