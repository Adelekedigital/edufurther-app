import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchPill } from './MatchPill';

const base = {
  href: 'https://example.invalid/match',
  external: true,
  dock: 'center' as const,
  bottom: '24px',
  body: 'Share your goals and we’ll suggest mentors who fit your path.',
  onMinimise: vi.fn(),
  onRestore: vi.fn(),
};

describe('MatchPill', () => {
  it('full pill: link opens in a new tab and × minimises', async () => {
    const onMinimise = vi.fn();
    render(<MatchPill {...base} size="full" miniAction="restore" onMinimise={onMinimise} />);
    const link = screen.getByRole('link', { name: /Find matches/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await userEvent.click(screen.getByRole('button', { name: 'Minimise' }));
    expect(onMinimise).toHaveBeenCalled();
  });

  it('desktop: the round icon after × restores the pill', async () => {
    const onRestore = vi.fn();
    render(<MatchPill {...base} size="mini" miniAction="restore" onRestore={onRestore} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Show “Not sure who’s right for you?”' }),
    );
    expect(onRestore).toHaveBeenCalled();
  });

  it('phones: the round icon opens an explainer popover, and closes it again', async () => {
    render(<MatchPill {...base} size="mini" miniAction="popover" />);
    const toggle = screen.getByRole('button', { name: 'Not sure who’s right for you?' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(base.body)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Find my matches/ })).toHaveAttribute(
      'target',
      '_blank',
    );

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('phones: Escape closes the popover and returns focus to the icon', async () => {
    render(<MatchPill {...base} size="mini" miniAction="popover" />);
    const toggle = screen.getByRole('button', { name: 'Not sure who’s right for you?' });
    await userEvent.click(toggle);
    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
});
