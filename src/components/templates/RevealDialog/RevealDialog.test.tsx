import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PREVIEW_COPY } from '@/lib/copy/preview';
import { RevealDialog } from './RevealDialog';

const open = (over: Partial<Parameters<typeof RevealDialog>[0]> = {}) => {
  const props = {
    firstName: 'Amara',
    maxLength: 500,
    onReveal: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<RevealDialog {...props} />);
  return props;
};

describe('RevealDialog', () => {
  it('names whose details, and asks for a reason', () => {
    open();
    const dialog = screen.getByRole('dialog', { name: 'Reveal hidden details' });
    expect(dialog).toHaveAccessibleDescription(
      'You’ll see Amara’s messages for the rest of this preview. Your name and reason are logged.',
    );
    const reason = screen.getByRole('textbox', { name: 'Reason' });
    // The copy's own string: a ticket number written here reads as a raw colour.
    expect(reason).toHaveAttribute('placeholder', PREVIEW_COPY.reveal.placeholder);
    expect(reason).toBeRequired();
  });

  it('an empty reason says so on the field and sends nothing', async () => {
    const { onReveal } = open();
    await userEvent.type(screen.getByRole('textbox', { name: 'Reason' }), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }));
    expect(screen.getByText('Add a reason to reveal.').closest('[role="alert"]')).not.toBeNull();
    const reason = screen.getByRole('textbox', { name: 'Reason' });
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(reason).toHaveAccessibleDescription('Add a reason to reveal.');
    expect(reason).toHaveFocus();
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('sends the reason, trimmed', async () => {
    const { onReveal } = open();
    await userEvent.type(screen.getByRole('textbox', { name: 'Reason' }), ' Ticket 4821 ');
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }));
    expect(onReveal).toHaveBeenCalledWith('Ticket 4821');
  });

  it('Cancel closes it', async () => {
    const { onClose } = open();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('pending: Reveal is busy and Cancel is off; a failure says so', () => {
    open({ pending: true, error: 'We couldn’t reveal this. Try again.' });
    expect(screen.getByRole('button', { name: 'Revealing…' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByText('We couldn’t reveal this. Try again.')).toBeInTheDocument();
  });
});
