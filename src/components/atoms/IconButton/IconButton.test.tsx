import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('ring: the DS CircleIconButton, a 24px glyph whatever the size', () => {
    render(<IconButton variant="ring" size="sm" icon="settings" aria-label="Message settings" />);
    const b = screen.getByRole('button', { name: 'Message settings' });
    expect(b.className).toMatch(/ring/);
    expect(b.className).not.toMatch(/\bsm\b|_sm/);
    expect(b.querySelector('[aria-hidden]')).toHaveStyle({ '--icon-size': '24px' });
  });

  it('glyph overrides the size’s own glyph', () => {
    render(<IconButton size="lg" glyph={24} icon="arrow_back" aria-label="Back" />);
    expect(screen.getByRole('button', { name: 'Back' }).querySelector('[aria-hidden]')).toHaveStyle(
      { '--icon-size': '24px' },
    );
  });

  it('unavailable: stays focusable, says it is off, gives its title as the reason, ignores clicks and keys', async () => {
    const onClick = vi.fn();
    render(
      <IconButton
        icon="send"
        aria-label="Send"
        unavailable
        title="Write a message or attach a file to send."
        onClick={onClick}
      />,
    );
    const b = screen.getByRole('button', { name: 'Send' });
    expect(b).toBeEnabled();
    expect(b).toHaveAttribute('aria-disabled', 'true');
    expect(b).toHaveAttribute('data-unavailable');
    expect(b).toHaveAccessibleDescription('Write a message or attach a file to send.');
    await userEvent.click(b);
    b.focus();
    expect(b).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('without it, the click works and disabled stays native', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<IconButton icon="close" aria-label="Close" onClick={onClick} />);
    const b = screen.getByRole('button', { name: 'Close' });
    expect(b).not.toHaveAttribute('aria-disabled');
    expect(b).not.toHaveAttribute('data-unavailable');
    await userEvent.click(b);
    expect(onClick).toHaveBeenCalledOnce();
    rerender(<IconButton icon="close" aria-label="Close" onClick={onClick} disabled />);
    expect(b).toBeDisabled();
    expect(b).not.toHaveAttribute('aria-disabled');
  });

  it('keeps a caller’s own aria-disabled', () => {
    render(<IconButton icon="lock" aria-label="Locked" aria-disabled="true" />);
    expect(screen.getByRole('button', { name: 'Locked' })).toHaveAttribute('aria-disabled', 'true');
  });
});
