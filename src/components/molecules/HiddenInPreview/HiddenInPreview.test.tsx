import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HiddenInPreview } from './HiddenInPreview';

describe('HiddenInPreview', () => {
  it('says the item is hidden, with Reveal when the admin can reveal', async () => {
    const onReveal = vi.fn();
    render(<HiddenInPreview onReveal={onReveal} />);
    expect(screen.getByText('Message hidden in preview')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }));
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it('draws no Reveal without can_reveal', () => {
    render(<HiddenInPreview />);
    expect(screen.getByText('Message hidden in preview')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('after a reveal: the quiet line, and nothing about hidden', () => {
    render(<HiddenInPreview revealed onReveal={vi.fn()} />);
    expect(screen.getByText('Revealed by you. Your reason was logged.')).toBeInTheDocument();
    expect(screen.queryByText('Message hidden in preview')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
