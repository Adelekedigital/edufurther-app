import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, reviews } from '@/components/organisms/ProfileHeader/profile.fixture';
import { ReviewsSummary } from '@/components/organisms/ReviewsSummary/ReviewsSummary';
import { GOOGLE_SIGN_IN_FAILED } from '@/lib/copy/auth';
import { ReviewsList } from './ReviewsList';

type Props = Parameters<typeof ReviewsList>[0];
const props = (over: Partial<Props> = {}): Props => ({
  reviews,
  isLoading: false,
  error: null,
  onRetry: vi.fn(),
  hasMore: false,
  isLoadingMore: false,
  loadMoreError: null,
  onLoadMore: vi.fn(),
  total: null,
  pageSize: 5,
  filters: [],
  filter: null,
  onFilter: vi.fn(),
  gate: null,
  ...over,
});

const gate = (over: Partial<NonNullable<Props['gate']>> = {}): NonNullable<Props['gate']> => ({
  firstName: 'Gbenga',
  total: 2,
  signupHref: '/signup',
  loginHref: '/login',
  onGoogle: vi.fn(),
  googleBusy: false,
  googleFailed: false,
  ...over,
});

describe('ReviewsList', () => {
  it('loading: skeleton rows and a status', () => {
    render(<ReviewsList {...props({ isLoading: true, reviews: [] })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading reviews');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('empty: no reviews yet says so, with no chips or order to offer (design `zeroReviews`)', () => {
    render(
      <ReviewsList
        {...props({
          reviews: [],
          filters: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
        })}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No reviews yet.');
    expect(screen.queryByRole('group', { name: 'Filter reviews by session' })).toBeNull();
    expect(screen.queryByText('Most recent first')).toBeNull();
  });

  it('empty: a filter with no reviews says so, and keeps the chips to switch back', () => {
    render(
      <ReviewsList
        {...props({
          reviews: [],
          filter: 'a',
          filters: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
        })}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No reviews for this session yet.');
    expect(screen.getByRole('group', { name: 'Filter reviews by session' })).toBeInTheDocument();
  });

  it('content: each review with its stars, date and topic; a deleted author', () => {
    render(<ReviewsList {...props()} />);
    expect(screen.getAllByRole('article')).toHaveLength(5);
    expect(screen.getAllByRole('img', { name: 'Rated 4 out of 5' })).toHaveLength(2);
    expect(screen.getByText('Apr 19, 2026')).toBeInTheDocument();
    expect(screen.getByText('Deleted user')).toBeInTheDocument();
  });

  it('"Show N more reviews" loads the next page; "Try again" after a failure', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <ReviewsList {...props({ hasMore: true, total: 6, onLoadMore })} />,
    );
    await user.click(screen.getByRole('button', { name: 'Show 1 more review' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Showing 5 of 6')).toBeInTheDocument();
    // No "Show fewer": the list only grows.
    expect(screen.queryByRole('button', { name: /fewer/i })).not.toBeInTheDocument();
    rerender(<ReviewsList {...props({ hasMore: true, total: 6, isLoadingMore: true })} />);
    expect(screen.getByRole('button', { name: 'Show 1 more review' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    rerender(
      <ReviewsList
        {...props({ hasMore: true, onLoadMore, loadMoreError: { kind: 'server', message: 'x' } })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load more reviews.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('a page at a time: at most five, and a full page with no caption under a filter', () => {
    const { rerender } = render(<ReviewsList {...props({ hasMore: true, total: 20 })} />);
    expect(screen.getByRole('button', { name: 'Show 5 more reviews' })).toBeInTheDocument();
    expect(screen.getByText('Showing 5 of 20')).toBeInTheDocument();
    rerender(<ReviewsList {...props({ hasMore: true, total: null, filter: 'a' })} />);
    expect(screen.getByRole('button', { name: 'Show 5 more reviews' })).toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('shows filter chips only with two or more session types', () => {
    const { rerender } = render(
      <ReviewsList {...props({ filters: [{ id: 'a', label: 'SOP draft review' }] })} />,
    );
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    rerender(
      <ReviewsList
        {...props({
          filters: [
            { id: 'a', label: 'SOP draft review' },
            { id: 'b', label: 'Mock visa interview' },
          ],
          filter: 'b',
        })}
      />,
    );
    expect(screen.getByRole('button', { name: 'Mock visa interview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('a guest: redacted text never in the page, no "Show more", the sign-up card', () => {
    // The real text goes in: the gate alone must keep it off the page.
    const r = reviews[0]!;
    render(
      <ReviewsList
        {...props({
          reviews: [r],
          hasMore: true,
          gate: gate(),
        })}
      />,
    );
    expect(screen.queryByText(reviews[0]!.text)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument();
    expect(screen.getByText('+1 more review from mentees')).toBeInTheDocument();
  });

  it('the gate: email, then Google (Mentor Profile.dc.html order), then Log in', async () => {
    const onGoogle = vi.fn();
    render(<ReviewsList {...props({ reviews: [reviews[0]!], gate: gate({ onGoogle }) })} />);
    const email = screen.getByRole('link', { name: 'Continue with email' });
    const google = screen.getByRole('button', { name: 'Continue with Google' });
    const login = screen.getByRole('link', { name: 'Log in' });
    expect(email.compareDocumentPosition(google) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(google.compareDocumentPosition(login) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(google);
    expect(onGoogle).toHaveBeenCalledTimes(1);
  });

  it('the gate: Google busy while it leaves, and the sign-in error if it fails', () => {
    const { rerender } = render(
      <ReviewsList {...props({ reviews: [reviews[0]!], gate: gate({ googleBusy: true }) })} />,
    );
    expect(screen.getByRole('button', { name: 'Taking you to Google…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    rerender(
      <ReviewsList {...props({ reviews: [reviews[0]!], gate: gate({ googleFailed: true }) })} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(GOOGLE_SIGN_IN_FAILED);
  });
});

describe('ReviewsSummary', () => {
  it('shows the average, n in 10, the two most praised and every bar', () => {
    render(<ReviewsSummary summary={fullProfile.reviews} firstName="Gbenga" />);
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('from 7 verified reviews')).toBeInTheDocument();
    expect(screen.getByText('9 in 10')).toBeInTheDocument();
    // Knowledge 96, then Support 91 (ties keep the design's order).
    expect(screen.getByText('Knowledge 96%')).toBeInTheDocument();
    expect(screen.getByText('Support 91%')).toBeInTheDocument();
    expect(screen.queryByText('Practicality 91%')).not.toBeInTheDocument();
    expect(screen.getByText('Practicality')).toBeInTheDocument();
  });

  it('leaves out what has no data yet', () => {
    render(
      <ReviewsSummary
        summary={{
          count: 1,
          rating: 5,
          wouldRecommendIn10: null,
          attributes: { communication: null, knowledge: null, support: null, practicality: null },
        }}
        firstName="Ada"
      />,
    );
    expect(screen.getByText('from 1 verified review')).toBeInTheDocument();
    expect(screen.queryByText(/in 10/)).not.toBeInTheDocument();
    expect(screen.queryByText('Most praised for')).not.toBeInTheDocument();
  });
});
