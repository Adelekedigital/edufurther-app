import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchPill } from './MatchPill';

const base = {
  href: 'https://example.invalid/match',
  external: true,
  dock: 'center' as const,
  bottom: '24px',
  onMinimise: vi.fn(),
  onRestore: vi.fn(),
};

describe('MatchPill', () => {
  it('full pill: link opens in a new tab and × minimises', async () => {
    const onMinimise = vi.fn();
    render(<MatchPill {...base} size="full" miniAction="open" onMinimise={onMinimise} />);
    const link = screen.getByRole('link', { name: /Find matches/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await userEvent.click(screen.getByRole('button', { name: 'Minimise' }));
    expect(onMinimise).toHaveBeenCalled();
  });

  it('mini after × restores the pill', async () => {
    const onRestore = vi.fn();
    render(<MatchPill {...base} size="mini" miniAction="restore" onRestore={onRestore} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Show “Not sure who’s right for you?”' }),
    );
    expect(onRestore).toHaveBeenCalled();
  });

  it('mini near the pager on phones still opens matches', () => {
    render(<MatchPill {...base} size="mini" miniAction="open" />);
    expect(screen.getByRole('link', { name: 'Find my mentor matches' })).toBeInTheDocument();
  });
});
