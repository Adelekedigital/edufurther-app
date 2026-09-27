import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mentor } from '@/types/mentor';
import { MentorResults, type MentorResultsProps } from './MentorResults';

const mentor = (over: Partial<Mentor> = {}): Mentor => ({
  id: 'm1',
  profileHref: '/mentors/m1',
  name: 'Olajuwon Samuel',
  firstName: 'Olajuwon',
  initials: 'OS',
  photoUrl: null,
  tone: 1,
  degreeLine: 'MSc, Computer Science',
  institution: 'University of London',
  completedSessions: 23,
  reviewCount: 11,
  rating: 4.9,
  label: 'top-rated',
  nextAvailableAt: '2026-09-28T12:00:00Z',
  topics: [{ slug: 'application-documents', label: 'Application documents' }],
  ...over,
});

const props = (over: Partial<MentorResultsProps> = {}): MentorResultsProps => ({
  mentors: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
  onRetry: vi.fn(),
  countLabel: 'All mentors',
  total: null,
  timeZone: 'UTC',
  hasFilters: false,
  query: '',
  onClearSearch: vi.fn(),
  onBook: vi.fn(),
  offline: false,
  restarted: false,
  onDismissRestarted: vi.fn(),
  hasMore: false,
  isLoadingMore: false,
  loadMoreError: null,
  onLoadMore: vi.fn(),
  showTopics: false,
  ...over,
});

describe('MentorResults', () => {
  it('loading: announces loading and renders no cards', () => {
    render(<MentorResults {...props({ isLoading: true })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading mentors');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('error is checked before empty, and Try again retries', async () => {
    const onRetry = vi.fn();
    render(<MentorResults {...props({ error: { kind: 'server', message: 'x' }, onRetry })} />);
    expect(screen.getByRole('heading', { name: 'We couldn’t load mentors' })).toBeInTheDocument();
    expect(screen.queryByText(/on their way/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('error while offline says so', () => {
    render(<MentorResults {...props({ error: { kind: 'offline', message: 'x' } })} />);
    expect(screen.getByText(/You’re offline/)).toBeInTheDocument();
  });

  it('empty with filters: offers Clear search', async () => {
    const onClearSearch = vi.fn();
    render(<MentorResults {...props({ hasFilters: true, query: 'zzz', onClearSearch })} />);
    expect(screen.getByRole('heading', { name: 'No mentors match that' })).toBeInTheDocument();
    expect(screen.getByText(/No one matches “zzz”/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onClearSearch).toHaveBeenCalled();
  });

  it('empty with no filters is "no mentors at all" — no Clear button, no Notify me (held)', () => {
    render(<MentorResults {...props()} />);
    expect(screen.getByRole('heading', { name: 'Mentors are on their way' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('content: renders cards and books with the chosen mentor', async () => {
    const onBook = vi.fn();
    const m = mentor();
    render(<MentorResults {...props({ mentors: [m], onBook })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Book session with Olajuwon' }));
    expect(onBook).toHaveBeenCalledWith(m);
    expect(
      screen.getByText('That’s everyone for now. Try other topics to see more mentors.'),
    ).toBeInTheDocument();
  });

  it('paging: Show more, then its loading and error states', async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <MentorResults {...props({ mentors: [mentor()], hasMore: true, onLoadMore })} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Show more mentors' }));
    expect(onLoadMore).toHaveBeenCalled();

    rerender(
      <MentorResults {...props({ mentors: [mentor()], hasMore: true, isLoadingMore: true })} />,
    );
    expect(screen.getByRole('button', { name: 'Loading mentors…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );

    rerender(
      <MentorResults
        {...props({
          mentors: [mentor()],
          hasMore: true,
          loadMoreError: { kind: 'server', message: 'x' },
        })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load more mentors.');
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('offline with results: notice, and Book is disabled with a reason', () => {
    render(<MentorResults {...props({ mentors: [mentor()], offline: true, hasMore: true })} />);
    expect(screen.getByText(/These are mentors from your last visit/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Booking needs a connection' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show more mentors' })).toBeDisabled();
  });

  it('restarted: dismissible notice', async () => {
    const onDismissRestarted = vi.fn();
    render(
      <MentorResults {...props({ mentors: [mentor()], restarted: true, onDismissRestarted })} />,
    );
    expect(screen.getByText('The list was updated.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismissRestarted).toHaveBeenCalled();
  });

  it('topic tags are hidden when showTopics is false (design cardTopics=hide)', () => {
    render(<MentorResults {...props({ mentors: [mentor()] })} />);
    expect(screen.queryByRole('list', { name: 'Helps with' })).not.toBeInTheDocument();
  });

  it('interstitial goes after the first row when there is more than one row', () => {
    const ms = [1, 2, 3].map((i) =>
      mentor({ id: `m${i}`, name: `Mentor ${i}`, firstName: `M${i}` }),
    );
    render(<MentorResults {...props({ mentors: ms, interstitial: <aside>PROMPT</aside> })} />);
    const text = document.body.textContent ?? '';
    expect(text.indexOf('Mentor 2')).toBeLessThan(text.indexOf('PROMPT'));
    expect(text.indexOf('PROMPT')).toBeLessThan(text.indexOf('Mentor 3'));
  });

  it('interstitial falls back to the bottom with one row or less', () => {
    render(
      <MentorResults {...props({ mentors: [mentor()], interstitial: <aside>PROMPT</aside> })} />,
    );
    const text = document.body.textContent ?? '';
    expect(text.indexOf('That’s everyone')).toBeLessThan(text.indexOf('PROMPT'));
  });
});
