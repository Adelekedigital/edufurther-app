import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleButton } from './GoogleButton';

describe('GoogleButton', () => {
  it('is a button named by its words, not by the mark', async () => {
    render(<GoogleButton onClick={() => {}} />);
    const button = screen.getByRole('button', { name: 'Continue with Google' });
    // The G mark is Google's brand, and decorative: the name must not repeat it.
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('starts sign-in on a press', async () => {
    const onClick = vi.fn();
    render(<GoogleButton onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('says what it is doing while busy, and does not fire twice', async () => {
    const onClick = vi.fn();
    render(<GoogleButton onClick={onClick} busy lastUsed />);
    const button = screen.getByRole('button', { name: 'Taking you to Google…' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('names the Last used badge as part of the button, in one label', () => {
    render(<GoogleButton onClick={() => {}} lastUsed />);
    const button = screen.getByRole('button', { name: 'Continue with Google, last used' });
    // One string, not visible text stitched to an .sr-only piece (failure log #51).
    expect(button).toHaveAttribute('aria-label', 'Continue with Google, last used');
    expect(screen.getByText('Last used')).toHaveAttribute('aria-hidden', 'true');
  });

  it('can be disabled (offline)', () => {
    render(<GoogleButton onClick={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
