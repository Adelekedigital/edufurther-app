import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sessionTypes } from '../ProfileHeader/profile.fixture';
import { BookSessionCard } from './BookSessionCard';

const props = { onBook: vi.fn(), onCompare: vi.fn(), bookBlocked: null };

describe('BookSessionCard', () => {
  it('one offering: Book opens it', async () => {
    const onBook = vi.fn();
    const user = userEvent.setup();
    render(<BookSessionCard {...props} onBook={onBook} sessionTypes={[sessionTypes[0]!]} />);
    await user.click(screen.getByRole('button', { name: 'Book this session' }));
    expect(onBook).toHaveBeenCalledWith(sessionTypes[0]!.id);
  });

  it('nothing to book and taking bookings: no card', () => {
    const { container } = render(<BookSessionCard {...props} sessionTypes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  describe('not taking bookings (backend #301)', () => {
    it('one offering: it stays to read, says why, and offers no Book', () => {
      render(<BookSessionCard {...props} sessionTypes={[sessionTypes[0]!]} notTaking />);
      expect(screen.getByRole('heading', { name: sessionTypes[0]!.name })).toBeInTheDocument();
      expect(screen.getByText('Not taking bookings right now.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Book/ })).toBeNull();
      expect(screen.queryByText(/pick a time/)).toBeNull();
    });

    it('several: headed "Sessions", no Book on any row, one note', () => {
      render(<BookSessionCard {...props} sessionTypes={sessionTypes} notTaking />);
      expect(screen.getByRole('region', { name: 'Sessions' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Book/ })).toBeNull();
      expect(screen.getAllByText('Not taking bookings right now.')).toHaveLength(1);
    });

    it('none visible: a "Sessions" card that just says why', () => {
      render(<BookSessionCard {...props} sessionTypes={[]} notTaking />);
      expect(screen.getByRole('region', { name: 'Sessions' })).toHaveTextContent(
        'Not taking bookings right now.',
      );
    });
  });
});
