import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sessionTypes } from '../ProfileHeader/profile.fixture';
import { SessionTypeList, SessionTypeListSkeleton } from './SessionTypeList';

describe('SessionTypeList', () => {
  it('Book opens that type; a block says why and disables it', async () => {
    const onBook = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <SessionTypeList sessionTypes={sessionTypes} onBook={onBook} bookBlocked={null} canBook />,
    );
    await user.click(screen.getAllByRole('button', { name: 'Book session' })[1]!);
    expect(onBook).toHaveBeenCalledWith(sessionTypes[1]!.id);
    rerender(
      <SessionTypeList
        sessionTypes={sessionTypes}
        onBook={onBook}
        bookBlocked="Booking needs a connection"
        canBook
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Booking needs a connection' })[0]).toBeDisabled();
  });

  it('drawn but off (the owner’s "View as mentee"): labels as usual, disabled', () => {
    render(
      <SessionTypeList
        sessionTypes={sessionTypes}
        onBook={vi.fn()}
        bookBlocked={null}
        canBook
        bookDisabled
      />,
    );
    const books = screen.getAllByRole('button', { name: 'Book session' });
    expect(books).toHaveLength(sessionTypes.length);
    for (const b of books) expect(b).toBeDisabled();
  });

  it('no Book for someone who can’t book', () => {
    render(
      <SessionTypeList
        sessionTypes={sessionTypes}
        onBook={vi.fn()}
        bookBlocked={null}
        canBook={false}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('each card says how it books, after the length and stage chips', () => {
    render(
      <SessionTypeList sessionTypes={sessionTypes} onBook={vi.fn()} bookBlocked={null} canBook />,
    );
    const cards = screen.getAllByRole('listitem');
    expect(cards[0]).toHaveTextContent('60 minflagDraftinghow_to_regRequest to book');
    expect(cards[1]).toHaveTextContent('45 minboltInstant booking');
  });

  it('a card whose booking mode isn’t known yet shows no label', () => {
    const [first] = sessionTypes;
    render(
      <SessionTypeList
        sessionTypes={[{ ...first!, requiresConfirmation: undefined }]}
        onBook={vi.fn()}
        bookBlocked={null}
        canBook
      />,
    );
    expect(screen.queryByText(/Request to book|Instant booking/)).toBeNull();
  });

  it('the skeleton: card-sized blocks in the list’s grid, announced once', () => {
    const { container } = render(
      <SessionTypeListSkeleton count={2} label="Loading your sessions" />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading your sessions');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('ul')?.className).toMatch(/grid/);
  });
});
