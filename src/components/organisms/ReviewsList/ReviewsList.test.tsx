import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, reviews } from '@/components/organisms/ProfileHeader/profile.fixture';
import { ReviewsSummary } from '@/components/organisms/ReviewsSummary/ReviewsSummary';
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
  remaining: null,
  filters: [],
  filter: null,
  onFilter: vi.fn(),
  gate: null,
  ...over,
});

describe('ReviewsList', () => {
  it('loading: skeleton rows and a status', () => {
    render(<ReviewsList {...props({ isLoading: true, reviews: [] })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading reviews');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('empty: a filter with no reviews says so', () => {
    render(<ReviewsList {...props({ reviews: [] })} />);
    expect(screen.getByRole('status')).toHaveTextContent('No reviews for this session yet.');
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
      <ReviewsList {...props({ hasMore: true, remaining: 1, onLoadMore })} />,
    );
    await user.click(screen.getByRole('button', { name: 'Show 1 more review' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    rerender(
      <ReviewsList
        {...props({ hasMore: true, onLoadMore, loadMoreError: { kind: 'server', message: 'x' } })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load more reviews.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onLoadMore).toHaveBeenCalledTimes(2);
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
          gate: { firstName: 'Gbenga', total: 2, signupHref: '/signup', loginHref: '/login' },
        })}
      />,
    );
    expect(screen.queryByText(reviews[0]!.text)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument();
    expect(screen.getByText('+1 more review from mentees')).toBeInTheDocument();
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
