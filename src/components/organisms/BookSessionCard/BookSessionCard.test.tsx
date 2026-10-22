import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sessionTypes } from '../ProfileHeader/profile.fixture';
import { BookSessionCard } from './BookSessionCard';

const props = { onBook: vi.fn(), onCompare: vi.fn(), bookBlocked: null, timeZone: 'Africa/Lagos' };

describe('BookSessionCard', () => {
  it('one offering: Book opens it', async () => {
    const onBook = vi.fn();
    const user = userEvent.setup();
    render(<BookSessionCard {...props} onBook={onBook} sessionTypes={[sessionTypes[0]!]} />);
    await user.click(screen.getByRole('button', { name: 'Book this session' }));
    expect(onBook).toHaveBeenCalledWith(sessionTypes[0]!.id);
  });

  it('nothing to book: no card', () => {
    const { container } = render(<BookSessionCard {...props} sessionTypes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('drawn but off (the owner’s "View as mentee"): labels as usual, disabled', () => {
    const { rerender } = render(
      <BookSessionCard {...props} bookDisabled sessionTypes={[sessionTypes[0]!]} />,
    );
    expect(screen.getByRole('button', { name: 'Book this session' })).toBeDisabled();
    rerender(<BookSessionCard {...props} bookDisabled sessionTypes={sessionTypes} />);
    for (const b of screen.getAllByRole('button', { name: /^Book/ })) expect(b).toBeDisabled();
  });

  it('one offering: the meta says how booking works, not the venue', () => {
    render(<BookSessionCard {...props} sessionTypes={[sessionTypes[0]!]} />);
    expect(
      screen.getByRole('img', { name: 'Request to book: the mentor approves each booking' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Google Meet')).not.toBeInTheDocument();
    expect(screen.queryByText('videocam')).not.toBeInTheDocument();
  });

  it('several: the subtitle counts them and names the zone; each row says how it books', () => {
    render(<BookSessionCard {...props} sessionTypes={sessionTypes} />);
    expect(screen.getByText('3 sessions · times in Lagos (WAT)')).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('60 minhow_to_regRequest to book');
    expect(rows[1]).toHaveTextContent('45 minboltInstant booking');
  });

  it('a zone without a short name shows its city', () => {
    render(<BookSessionCard {...props} timeZone="America/Sao_Paulo" sessionTypes={sessionTypes} />);
    expect(screen.getByText('3 sessions · times in Sao Paulo')).toBeInTheDocument();
  });
});
