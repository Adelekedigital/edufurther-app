import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareMenu } from './ShareMenu';

describe('ShareMenu', () => {
  it('opens on Enter, moves with arrows, closes on Escape back to the button', async () => {
    const user = userEvent.setup();
    render(<ShareMenu url="https://edufurther.com/mentors/g" name="Gbenga E" />);
    const button = screen.getByRole('button', { name: 'Share profile' });
    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Copy profile link' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Share on LinkedIn' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('builds share links from the encoded URL and announces a copy', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ShareMenu url="https://edufurther.com/mentors/g?x=1" name="Gbenga E" />);
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    expect(screen.getByRole('menuitem', { name: 'Share on LinkedIn' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fedufurther.com%2Fmentors%2Fg%3Fx%3D1',
    );
    await user.click(screen.getByRole('menuitem', { name: 'Copy profile link' }));
    expect(writeText).toHaveBeenCalledWith('https://edufurther.com/mentors/g?x=1');
    expect(await screen.findByRole('status')).toHaveTextContent('Link copied');
  });
});
