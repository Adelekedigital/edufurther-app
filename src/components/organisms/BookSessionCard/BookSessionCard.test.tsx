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

  it('nothing to book: no card', () => {
    const { container } = render(<BookSessionCard {...props} sessionTypes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
