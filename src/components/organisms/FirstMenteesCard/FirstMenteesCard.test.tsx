import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FirstMenteesCard } from './FirstMenteesCard';

const mentee = {
  variant: 'mentee' as const,
  firstName: 'Gbenga',
  nextTime: '2026-10-02T15:00:00Z',
  timeZone: 'UTC',
  move: null,
  award: null,
};

describe('FirstMenteesCard (mentee)', () => {
  it('Book opens that time', async () => {
    const onBook = vi.fn();
    const user = userEvent.setup();
    render(<FirstMenteesCard {...mentee} onBook={onBook} />);
    await user.click(screen.getByRole('button', { name: /^Book/ }));
    expect(onBook).toHaveBeenCalledWith(mentee.nextTime);
  });

  it('no onBook: no button', () => {
    render(<FirstMenteesCard {...mentee} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('drawn but off (the owner’s "View as mentee")', () => {
    render(<FirstMenteesCard {...mentee} bookDisabled />);
    expect(screen.getByRole('button', { name: /^Book/ })).toBeDisabled();
  });

  it('the award fact says ", fully funded" only when it was', () => {
    const award = (funding: 'full' | 'partial' | null, title = 'Chevening Scholarship') => {
      const { unmount } = render(<FirstMenteesCard {...mentee} award={{ title, funding }} />);
      const v = screen.getByText('Got funded.').parentElement?.textContent;
      unmount();
      return v?.replace('Got funded. ', '');
    };
    expect(award('full')).toBe('Chevening Scholarship, fully funded.');
    expect(award('partial')).toBe('Chevening Scholarship.');
    expect(award(null)).toBe('Chevening Scholarship.');
    // A title that ends its own sentence isn't stopped twice.
    expect(award(null, 'Best thesis award!')).toBe('Best thesis award!');
    expect(award('full', 'Fulbright.')).toBe('Fulbright, fully funded.');
  });
});
