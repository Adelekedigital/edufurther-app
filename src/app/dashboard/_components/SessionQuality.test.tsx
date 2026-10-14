import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StatBlock, WindowStats } from '@/lib/api/data/mentorStats';
import { SessionQuality } from './SessionQuality';

let data: WindowStats | null;
let isLoading: boolean;
let error: { kind: string; message: string } | null;
const retry = vi.fn();

vi.mock('@/lib/api/data/mentorStats', () => ({
  useMentorStats: () => ({ data, isLoading, error, retry }),
}));

const block = (over: Partial<StatBlock> = {}): StatBlock => ({
  since: '2026-07-16T00:00:00Z',
  until: '2026-10-14T00:00:00Z',
  completedSessions: 12,
  mentoringMinutes: 720,
  menteesMentored: 6,
  // Consistent with completed / (completed + missed) = 12/14, so the ring (the
  // attendance_rate) and "held of settled" agree.
  attendanceRate: 86,
  missedByMentor: 2,
  cancelledByMentor: 2,
  reviewCount: 14,
  averageRating: 4.8,
  ...over,
});

const windowStats = (
  current: Partial<StatBlock>,
  previous: Partial<StatBlock> = {},
): WindowStats => ({
  windowDays: 90,
  current: block(current),
  previous: block({ attendanceRate: 90, ...previous }),
});

beforeEach(() => {
  data = null;
  isLoading = false;
  error = null;
  retry.mockClear();
});

describe('SessionQuality', () => {
  it('shows a loading status while the window is pending', () => {
    isLoading = true;
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your session quality');
  });

  it('shows the error state before the empty state, with a working retry', async () => {
    error = { kind: 'server', message: 'boom' };
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load your session quality.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('treats a null attendance rate as the empty state, never 0%', () => {
    data = windowStats({ attendanceRate: null, completedSessions: 0, reviewCount: 0 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('Starts after your first session')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('renders the on-track content: ring, breakdown, rating and the good banner', () => {
    data = windowStats({ attendanceRate: 86 }, { attendanceRate: 77 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByRole('img', { name: 'Show-up rate 86%' })).toBeInTheDocument();
    expect(screen.getByText('On track')).toBeInTheDocument();
    // The breakdown is plain counts, so nothing competes with the ring.
    expect(screen.getByText('Sessions completed')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rated 4.8 out of 5' })).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    // The count is a link to the profile's Reviews tab, labelled for context.
    const reviewsLink = screen.getByRole('link', { name: 'See all 14 reviews' });
    expect(reviewsLink).toHaveAttribute('href', '/mentors/gbenga?tab=reviews');
    expect(reviewsLink).toHaveTextContent('(14)');
    expect(screen.getByText(/keep it up/)).toBeInTheDocument();
    // Rising rate reassures.
    expect(screen.getByText(/Up from 77% last quarter/)).toBeInTheDocument();
  });

  it('renders the at-risk content: badge, banner and the two actions', () => {
    data = windowStats({ attendanceRate: 60, missedByMentor: 5, completedSessions: 9 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('At risk')).toBeInTheDocument();
    // The context line is a plain count, never a derived "N of M" ratio.
    expect(screen.getByText('5 missed sessions recently.')).toBeInTheDocument();
    expect(screen.getByText('5 mentees were left waiting')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review your hours' })).toHaveAttribute(
      'href',
      '/calendar',
    );
    expect(screen.getByRole('link', { name: 'See missed sessions' })).toHaveAttribute(
      'href',
      '/bookings',
    );
  });

  it('makes the at-risk banner title singular for a single miss', () => {
    data = windowStats({ attendanceRate: 50, missedByMentor: 1, completedSessions: 1 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('1 mentee was left waiting')).toBeInTheDocument();
  });

  it('keeps the context line honest when the rate is rising but still at risk', () => {
    // 50→60 is progress, but 60 < 85 is still at risk: show the rise as progress,
    // never the "count on you" reassurance beside an "At risk" badge.
    data = windowStats({ attendanceRate: 60, missedByMentor: 5 }, { attendanceRate: 50 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('At risk')).toBeInTheDocument();
    expect(
      screen.getByText('Up from 50% last quarter — 5 missed sessions recently.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Mentees can count on you/)).not.toBeInTheDocument();
  });

  it('never claims "left waiting" when an at-risk rate carries no recorded miss', () => {
    // Defensive: the ring is rate-based and needn't track missed_by_mentor, so a
    // below-target rate with zero misses must not render "0 … left waiting".
    data = windowStats({ attendanceRate: 70, missedByMentor: 0 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('At risk')).toBeInTheDocument();
    expect(screen.queryByText(/left waiting/)).not.toBeInTheDocument();
    expect(screen.getByText('Your show-up rate is slipping')).toBeInTheDocument();
    expect(screen.getByText('Below your usual show-up rate.')).toBeInTheDocument();
  });

  it('reassures without nagging about the odd miss while on track', () => {
    data = windowStats({ attendanceRate: 90, missedByMentor: 2 }, { attendanceRate: 90 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('On track')).toBeInTheDocument();
    expect(screen.getByText('Mentees can count on you.')).toBeInTheDocument();
    expect(screen.queryByText(/missed session/)).not.toBeInTheDocument();
  });

  it('reassures with no derived denominator when the rate held flat and none were missed', () => {
    data = windowStats({ attendanceRate: 100, missedByMentor: 0 }, { attendanceRate: 100 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('No sessions missed — mentees can count on you.')).toBeInTheDocument();
  });

  it('falls back to "No reviews yet" when the window has no rating, with no link', () => {
    data = windowStats({ attendanceRate: 92, averageRating: null, reviewCount: 0 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    // No rating means no review-count link to the profile's Reviews tab.
    expect(screen.queryByRole('link', { name: /reviews/ })).not.toBeInTheDocument();
  });
});
