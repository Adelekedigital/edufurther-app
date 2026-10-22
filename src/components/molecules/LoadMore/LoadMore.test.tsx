import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LOAD_MORE_COPY, showMoreLabel, showingCaption } from '@/lib/copy/loadMore';
import { LoadMore } from './LoadMore';

describe('LoadMore', () => {
  it('content: the button loads more; the caption follows it', async () => {
    const onLoadMore = vi.fn();
    const { container } = render(
      <LoadMore label="Show 5 more" caption="Showing 5 of 13" onLoadMore={onLoadMore} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Show 5 more' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    expect(container.firstElementChild!.lastElementChild).toHaveTextContent('Showing 5 of 13');
  });

  it('captionFirst puts the caption above the button', () => {
    const { container } = render(
      <LoadMore label="Show more" caption="Showing 24" captionFirst onLoadMore={vi.fn()} />,
    );
    expect(container.firstElementChild!.firstElementChild).toHaveTextContent('Showing 24');
  });

  it('no caption: just the button', () => {
    render(<LoadMore label="Show 5 more reviews" onLoadMore={vi.fn()} />);
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('busy: aria-busy, the busy label, and a press does nothing', async () => {
    const onLoadMore = vi.fn();
    render(
      <LoadMore
        label="Show more mentors"
        busy
        busyLabel="Loading mentors…"
        onLoadMore={onLoadMore}
      />,
    );
    const button = screen.getByRole('button', { name: 'Loading mentors…' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('busy without a busy label keeps the label', () => {
    render(<LoadMore label="Show 5 more" busy onLoadMore={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Show 5 more' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('disabled (offline): the button stays, inert', () => {
    render(<LoadMore label="Show more mentors" disabled onLoadMore={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Show more mentors' })).toBeDisabled();
  });

  it('error: announced, the caption gone, Try again loads more', async () => {
    const onLoadMore = vi.fn();
    render(
      <LoadMore
        label="Show 5 more"
        caption="Showing 5 of 13"
        error="We couldn’t load more reviews."
        onLoadMore={onLoadMore}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load more reviews.');
    expect(screen.queryByText('Showing 5 of 13')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show 5 more' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: LOAD_MORE_COPY.retry }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('error, retrying: Try again is busy (the error stays until the page lands)', async () => {
    const onLoadMore = vi.fn();
    render(<LoadMore label="Show 5 more" error="x" busy onLoadMore={onLoadMore} />);
    const retry = screen.getByRole('button', { name: LOAD_MORE_COPY.retry });
    expect(retry).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(retry);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('error, offline: Try again is inert too', () => {
    render(<LoadMore label="Show more mentors" error="x" disabled onLoadMore={vi.fn()} />);
    expect(screen.getByRole('button', { name: LOAD_MORE_COPY.retry })).toBeDisabled();
  });
});

describe('showMoreLabel', () => {
  const noun = { one: 'review', other: 'reviews' };
  it('says what one click loads, at most a page', () => {
    expect(showMoreLabel(5, 13)).toBe('Show 5 more');
    expect(showMoreLabel(5, 2, noun)).toBe('Show 2 more reviews');
    expect(showMoreLabel(5, 1, noun)).toBe('Show 1 more review');
  });
  it('a full page when what is left is unknown, or out of date', () => {
    expect(showMoreLabel(5, null, noun)).toBe('Show 5 more reviews');
    expect(showMoreLabel(5, 0)).toBe('Show 5 more');
  });
});

describe('showingCaption', () => {
  it('"of N" once the total is known, never past it', () => {
    expect(showingCaption(5, 13)).toBe('Showing 5 of 13');
    expect(showingCaption(10, 8)).toBe('Showing 8 of 8');
    expect(showingCaption(24, 57, 'mentors')).toBe('Showing 24 of 57 mentors');
  });
  it('the count alone without a total', () => {
    expect(showingCaption(5, null)).toBe('Showing 5');
    expect(showingCaption(24, null, 'mentors')).toBe('Showing 24 mentors');
  });
});
