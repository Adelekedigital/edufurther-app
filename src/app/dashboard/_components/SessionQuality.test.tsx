import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StatBlock, WindowStats } from '@/lib/api/data/mentorStats';
import type { ReviewQuote } from '@/lib/api/data/myReviews';
import { SessionQuality } from './SessionQuality';

let data: WindowStats | null;
let isLoading: boolean;
let error: { kind: string; message: string } | null;
const retry = vi.fn();

type QuoteState = {
  data: ReviewQuote | null;
  isLoading: boolean;
  error: { kind: string; message: string } | null;
  retry: () => void;
};
let quote: QuoteState;

vi.mock('@/lib/api/data/mentorStats', () => ({
  useMentorStats: () => ({ data, isLoading, error, retry }),
}));
vi.mock('@/lib/api/data/myReviews', () => ({
  useMyReviewQuote: () => quote,
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
  missedByMentee: 1,
  cancelledByMentor: 2,
  reviewCount: 14,
  averageRating: 4.8,
  ...over,
});

const windowStats = (
  current: Partial<StatBlock>,
  previous: Partial<StatBlock> = {},
  over: Partial<WindowStats> = {},
): WindowStats => ({
  windowDays: 90,
  currentStreak: 5,
  current: block(current),
  previous: block({ attendanceRate: 90, ...previous }),
  ...over,
});

const hasQuote = (over: Partial<ReviewQuote> = {}): QuoteState => ({
  data: { quote: 'The clearest hour I spent on my application.', by: 'Amara O. · Visa and interview', ...over },
  isLoading: false,
  error: null,
  retry: vi.fn(),
});

beforeEach(() => {
  data = null;
  isLoading = false;
  error = null;
  retry.mockClear();
  quote = hasQuote();
});

describe('SessionQuality', () => {
  // ---- the four states ------------------------------------------------------

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

  // ---- compact (default) view ----------------------------------------------

  it('defaults to the compact view: ring, teaser, rating line and quote — no breakdown', () => {
    data = windowStats({ attendanceRate: 86 }, { attendanceRate: 77 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByRole('img', { name: 'Show-up rate 86%' })).toBeInTheDocument();
    expect(screen.getByText('On track')).toBeInTheDocument();
    expect(screen.getByText('You’re holding your sessions')).toBeInTheDocument();
    // The rating line and the quote preview the reviews without expanding.
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('from 14')).toBeInTheDocument();
    expect(screen.getByText(/The clearest hour/)).toBeInTheDocument();
    expect(screen.getByText('Amara O. · Visa and interview')).toBeInTheDocument();
    // The full breakdown is collapsed until the disclosure is opened.
    expect(screen.queryByText('Sessions completed')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'See your full breakdown' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens and closes the breakdown through the disclosure button', async () => {
    data = windowStats({ attendanceRate: 86 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'See your full breakdown' }));
    const shown = screen.getByRole('button', { name: 'Show less' });
    expect(shown).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Sessions completed')).toBeInTheDocument();

    await user.click(shown);
    expect(screen.queryByText('Sessions completed')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See your full breakdown' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('uses a primary, differently-worded disclosure when at risk', () => {
    data = windowStats({ attendanceRate: 60, missedByMentor: 5 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('At risk')).toBeInTheDocument();
    // The at-risk teaser headlines the problem.
    expect(screen.getByText('5 mentees were left waiting')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'See what’s pulling this down' }),
    ).toBeInTheDocument();
  });

  // ---- expanded content -----------------------------------------------------

  it('renders the expanded on-track content: breakdown, rating, quote and the streak banner', async () => {
    data = windowStats({ attendanceRate: 86 }, { attendanceRate: 77 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See your full breakdown' }));

    expect(screen.getByText('Sessions completed')).toBeInTheDocument();
    expect(screen.getByText('Canceled by you')).toBeInTheDocument();
    expect(screen.getByText('Missed by you')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rated 4.8 out of 5' })).toBeInTheDocument();
    // The count links to the profile's Reviews tab, but never claims to be the
    // all-time total (the window count is not that total).
    const reviewsLink = screen.getByRole('link', { name: 'See all reviews' });
    expect(reviewsLink).toHaveAttribute('href', '/mentors/gbenga?tab=reviews');
    expect(reviewsLink).toHaveTextContent('(14)');
    // The streak carries the good banner.
    expect(screen.getByText(/5 sessions held in a row/)).toBeInTheDocument();
  });

  it('renders a "Mentee didn’t show" row from missed_by_mentee', async () => {
    data = windowStats({ attendanceRate: 86, missedByMentee: 3 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See your full breakdown' }));
    const row = screen.getByText('Mentee didn’t show').closest('div')!;
    expect(within(row).getByText('3')).toBeInTheDocument();
  });

  it('renders the at-risk expanded banner and its two actions', async () => {
    data = windowStats({ attendanceRate: 60, missedByMentor: 5, completedSessions: 9 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See what’s pulling this down' }));
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

  it('makes the at-risk banner title singular for a single miss', async () => {
    data = windowStats({ attendanceRate: 50, missedByMentor: 1, completedSessions: 1 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See what’s pulling this down' }));
    expect(screen.getByText('1 mentee was left waiting')).toBeInTheDocument();
  });

  // ---- the streak -----------------------------------------------------------

  it('drops the streak line and reassures plainly when the streak is zero', async () => {
    data = windowStats({ attendanceRate: 90 }, {}, { currentStreak: 0 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See your full breakdown' }));
    expect(screen.getByText(/keep it up/)).toBeInTheDocument();
    expect(screen.queryByText(/in a row/)).not.toBeInTheDocument();
  });

  // ---- reviews / quote states ----------------------------------------------

  it('shows the no-reviews message and no rating when the window has no rating', async () => {
    data = windowStats({ attendanceRate: 92, averageRating: null, reviewCount: 0 });
    quote = { data: null, isLoading: false, error: null, retry: vi.fn() };
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    // Compact: the message replaces the rating line and the quote.
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
    expect(screen.queryByText('4.8')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'See your full breakdown' }));
    // Expanded: still the message, and no link to a reviews tab.
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reviews/ })).not.toBeInTheDocument();
  });

  it('a failed quote fetch never breaks the card — the rating line still shows', () => {
    data = windowStats({ attendanceRate: 86 });
    quote = { data: null, isLoading: false, error: { kind: 'server', message: 'x' }, retry: vi.fn() };
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByRole('img', { name: 'Show-up rate 86%' })).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('from 14')).toBeInTheDocument();
    // A missing quote is not a "no reviews" state.
    expect(screen.queryByText(/No reviews yet/)).not.toBeInTheDocument();
  });

  it('shows the rating line but no quote while the quote is still loading', () => {
    data = windowStats({ attendanceRate: 86 });
    quote = { data: null, isLoading: true, error: null, retry: vi.fn() };
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.queryByText(/No reviews yet/)).not.toBeInTheDocument();
    expect(screen.queryByText(/The clearest hour/)).not.toBeInTheDocument();
  });
});
