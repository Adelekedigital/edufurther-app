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
  menteesLeftWaiting: 2,
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
    expect(screen.getByText('5 sessions in a row completed')).toBeInTheDocument();
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

  it('uses a differently-worded disclosure when at risk', () => {
    data = windowStats({ attendanceRate: 60, missedByMentor: 5, menteesLeftWaiting: 3 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('At risk')).toBeInTheDocument();
    // The at-risk teaser headlines the honest "left waiting" count, not missed-by-you.
    expect(screen.getByText('3 mentees were left waiting in 90 days')).toBeInTheDocument();
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
    // The count links to the profile's Reviews tab. The visible "(14)" is in the
    // accessible name (Label-in-Name), scoped so it never reads as an all-time total.
    const reviewsLink = screen.getByRole('link', {
      name: 'See all reviews — 14 in the last 90 days',
    });
    expect(reviewsLink).toHaveAttribute('href', '/mentors/gbenga?tab=reviews');
    expect(reviewsLink).toHaveTextContent('(14)');
    // The streak carries the good banner.
    expect(screen.getByText(/5 sessions in a row completed/)).toBeInTheDocument();
  });

  it('does not surface the mentee’s own no-shows to the mentor', async () => {
    data = windowStats({ attendanceRate: 86, missedByMentee: 3 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See your full breakdown' }));
    // The design shows only completed / canceled / missed-by-you.
    expect(screen.getByText('Missed by you')).toBeInTheDocument();
    expect(screen.queryByText('Mentee didn’t show')).not.toBeInTheDocument();
  });

  it('renders the at-risk expanded banner and its two actions', async () => {
    data = windowStats({
      attendanceRate: 60,
      missedByMentor: 5,
      menteesLeftWaiting: 3,
      completedSessions: 9,
    });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See what’s pulling this down' }));
    expect(screen.getByText('3 mentees were left waiting')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review your hours' })).toHaveAttribute(
      'href',
      '/calendar',
    );
    expect(screen.getByRole('link', { name: 'See missed sessions' })).toHaveAttribute(
      'href',
      '/bookings',
    );
  });

  it('makes the at-risk banner title singular for a single mentee left waiting', async () => {
    data = windowStats({
      attendanceRate: 50,
      missedByMentor: 1,
      menteesLeftWaiting: 1,
      completedSessions: 1,
    });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See what’s pulling this down' }));
    expect(screen.getByText('1 mentee was left waiting')).toBeInTheDocument();
  });

  it('counts mentees_left_waiting in the headline but missed_by_mentor in the row', async () => {
    // The honest distinction: 4 sessions missed, but only 2 had a mentee waiting.
    data = windowStats({
      attendanceRate: 50,
      missedByMentor: 4,
      menteesLeftWaiting: 2,
      completedSessions: 4,
    });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See what’s pulling this down' }));
    expect(screen.getByText('2 mentees were left waiting')).toBeInTheDocument();
    expect(screen.queryByText('4 mentees were left waiting')).not.toBeInTheDocument();
    const row = screen.getByText('Missed by you').closest('div')!;
    expect(within(row).getByText('4')).toBeInTheDocument();
  });

  it('never shows a left-waiting count above "Missed by you" (clamped)', async () => {
    // Defensive: if the backend ever sent left-waiting > missed, the headline must
    // not exceed the breakdown row beside it.
    data = windowStats({
      attendanceRate: 50,
      missedByMentor: 2,
      menteesLeftWaiting: 5,
      completedSessions: 2,
    });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See what’s pulling this down' }));
    expect(screen.getByText('2 mentees were left waiting')).toBeInTheDocument();
    expect(screen.queryByText('5 mentees were left waiting')).not.toBeInTheDocument();
  });

  it('names the rounded show-up rate when at risk with no mentee left waiting', async () => {
    // At risk via misses, but every miss was a double no-show → leftWaiting 0.
    // Teaser AND banner name the rate, rounded to match the ring — never "slipping".
    data = windowStats({
      attendanceRate: 60.7,
      missedByMentor: 2,
      menteesLeftWaiting: 0,
      completedSessions: 3,
    });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    // Compact teaser.
    expect(screen.getByText('Your show-up rate is 61%')).toBeInTheDocument();
    expect(screen.queryByText(/slipping|60\.7/)).not.toBeInTheDocument();
    // Expanded banner.
    await userEvent.click(screen.getByRole('button', { name: 'See what’s pulling this down' }));
    expect(screen.getByText('Your show-up rate is 61%')).toBeInTheDocument();
  });

  it('leads the no-reviews note with a star icon', () => {
    data = windowStats({ attendanceRate: 92, averageRating: null, reviewCount: 0 });
    quote = { data: null, isLoading: false, error: null, retry: vi.fn() };
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
    expect(screen.getByText('star')).toBeInTheDocument();
  });

  // ---- the streak -----------------------------------------------------------

  it('drops the streak line and reassures plainly when the streak is zero', async () => {
    data = windowStats({ attendanceRate: 90 }, {}, { currentStreak: 0 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See your full breakdown' }));
    expect(screen.getByText(/keep it up/)).toBeInTheDocument();
    expect(screen.queryByText(/in a row/)).not.toBeInTheDocument();
  });

  it('uses the singular streak line at exactly one held session', async () => {
    data = windowStats({ attendanceRate: 90 }, {}, { currentStreak: 1 });
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See your full breakdown' }));
    expect(screen.getByText(/1 session in a row completed/)).toBeInTheDocument();
    expect(screen.queryByText(/sessions in a row/)).not.toBeInTheDocument();
  });

  // ---- reviews / quote states ----------------------------------------------

  it('shows the breakdown inline, a no-reviews note, and no CTA when the window has no rating', () => {
    data = windowStats({ attendanceRate: 92, averageRating: null, reviewCount: 0 });
    quote = { data: null, isLoading: false, error: null, retry: vi.fn() };
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    // No reviews: the breakdown shows by default, with the note — no disclosure
    // to open and no rating line (Mentor Dashboard v2.dc.html).
    expect(screen.getByText('Sessions completed')).toBeInTheDocument();
    expect(screen.getByText('Missed by you')).toBeInTheDocument();
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
    expect(screen.queryByText('4.8')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /breakdown|pulling/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reviews/ })).not.toBeInTheDocument();
  });

  it('reads on-track with the went-ahead line and inline breakdown when there are no reviews', () => {
    // No reviews + a clean 100% record: the positive line, the breakdown inline,
    // and no disclosure control.
    data = windowStats({
      attendanceRate: 100,
      completedSessions: 3,
      missedByMentor: 0,
      cancelledByMentor: 0,
      missedByMentee: 0,
      reviewCount: 0,
      averageRating: null,
    });
    quote = { data: null, isLoading: false, error: null, retry: vi.fn() };
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('On track')).toBeInTheDocument();
    expect(
      screen.getByText('All 3 of your booked sessions went ahead. Mentees can count on you.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sessions completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /breakdown|pulling/ })).not.toBeInTheDocument();
  });

  it('gives a no-review at-risk mentor the "what’s pulling this down" CTA and guidance', async () => {
    // An at-risk mentor keeps the low treatment even with no reviews: the badge is
    // honest, and the disclosure opens the breakdown, the note and the guidance.
    data = windowStats({
      attendanceRate: 40,
      completedSessions: 0,
      missedByMentor: 1,
      menteesLeftWaiting: 1,
      cancelledByMentor: 0,
      missedByMentee: 0,
      reviewCount: 0,
      averageRating: null,
    });
    quote = { data: null, isLoading: false, error: null, retry: vi.fn() };
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText('At risk')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'See what’s pulling this down' }));
    expect(screen.getByText('Missed by you')).toBeInTheDocument();
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review your hours' })).toBeInTheDocument();
  });

  it('does not claim all sessions went ahead when a mentee no-showed', () => {
    // noReviews but not a clean record: a mentee no-show means not every booked
    // session went ahead, so the "all went ahead" line must not fire.
    data = windowStats({
      attendanceRate: 100,
      completedSessions: 3,
      missedByMentor: 0,
      cancelledByMentor: 0,
      missedByMentee: 2,
      reviewCount: 0,
      averageRating: null,
    });
    quote = { data: null, isLoading: false, error: null, retry: vi.fn() };
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(
      screen.queryByText(/All \d+ of your booked sessions went ahead/),
    ).not.toBeInTheDocument();
  });

  it('does not claim all went ahead when the show-up ring is below 100%', () => {
    // The ring and the breakdown rows don't always reconcile; "all went ahead"
    // must not contradict a sub-100% ring, even with zero miss/cancel counts.
    data = windowStats({
      attendanceRate: 86,
      completedSessions: 12,
      missedByMentor: 0,
      cancelledByMentor: 0,
      missedByMentee: 0,
      reviewCount: 0,
      averageRating: null,
    });
    quote = { data: null, isLoading: false, error: null, retry: vi.fn() };
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByRole('img', { name: 'Show-up rate 86%' })).toBeInTheDocument();
    expect(
      screen.queryByText(/All \d+ of your booked sessions went ahead/),
    ).not.toBeInTheDocument();
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

  it('always shows the latest review, even when the 90-day window has no rating', () => {
    // The quote (most recent review) is never gated on the window — a mentor whose
    // reviews aged out still sees it, not a false "No reviews yet".
    data = windowStats({ attendanceRate: 92, averageRating: null, reviewCount: 0 });
    quote = hasQuote();
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText(/The clearest hour/)).toBeInTheDocument();
    expect(screen.queryByText(/No reviews yet/)).not.toBeInTheDocument();
    // On track with no window rating → breakdown inline, no disclosure.
    expect(screen.getByText('Sessions completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /breakdown|pulling/ })).not.toBeInTheDocument();
  });

  it('shows the no-reviews note only once the quote settles empty, never while loading', () => {
    // On track, no window rating, no review: while the quote loads show neither (no
    // flash); once it settles empty the note stands in. The breakdown stays inline.
    data = windowStats({ attendanceRate: 92, averageRating: null, reviewCount: 0 });
    quote = { data: null, isLoading: true, error: null, retry: vi.fn() };
    const { rerender } = render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.queryByText(/No reviews yet/)).not.toBeInTheDocument();
    expect(screen.getByText('Sessions completed')).toBeInTheDocument();

    quote = { data: null, isLoading: false, error: { kind: 'server', message: 'x' }, retry: vi.fn() };
    rerender(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
    expect(screen.queryByText('4.8')).not.toBeInTheDocument();
  });

  it('keeps the expanded card intact when the quote fails — stars, no quote, no message', async () => {
    data = windowStats({ attendanceRate: 86 });
    quote = { data: null, isLoading: false, error: { kind: 'server', message: 'x' }, retry: vi.fn() };
    render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See your full breakdown' }));
    expect(screen.getByRole('img', { name: 'Rated 4.8 out of 5' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See all reviews/ })).toBeInTheDocument();
    expect(screen.queryByText(/No reviews yet/)).not.toBeInTheDocument();
    expect(screen.queryByText(/The clearest hour/)).not.toBeInTheDocument();
  });

  it('moves focus to the heading when a refetch collapses an expanded panel', async () => {
    // P1: an on-track mentor with a rating expands the panel; a refetch then returns
    // no window rating, so the panel can no longer expand and unmounts. Focus must
    // land on the card heading, not be lost to <body>.
    data = windowStats({ attendanceRate: 86 });
    const { rerender } = render(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    await userEvent.click(screen.getByRole('button', { name: 'See your full breakdown' }));
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveFocus();

    data = windowStats({ attendanceRate: 86, averageRating: null, reviewCount: 0 });
    rerender(<SessionQuality userId="u1" profileHref="/mentors/gbenga" />);
    expect(screen.getByRole('heading', { name: 'Session quality' })).toHaveFocus();
  });
});
