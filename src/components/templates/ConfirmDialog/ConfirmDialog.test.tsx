import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

const base = {
  title: 'Delete this award?',
  subtitle: 'This can’t be undone.',
  icon: 'delete' as const,
  tone: 'danger' as const,
  keepLabel: 'Keep it',
  confirmLabel: 'Delete award',
};

describe('ConfirmDialog', () => {
  it('is an alertdialog named by its title and described by its subtitle', () => {
    render(<ConfirmDialog {...base} onKeep={vi.fn()} onConfirm={vi.fn()} />);
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this award?' });
    expect(dialog).toHaveAccessibleDescription('This can’t be undone.');
  });

  it('opens on the safe choice, not on the destructive one', () => {
    render(<ConfirmDialog {...base} onKeep={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus();
  });

  it('Keep it, Escape and the close button all keep', async () => {
    const onKeep = vi.fn();
    render(<ConfirmDialog {...base} onKeep={onKeep} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onKeep).toHaveBeenCalledTimes(3);
  });

  it('confirms once, even when clicked again while it runs', async () => {
    function Host() {
      const [pending, setPending] = useState(false);
      return (
        <ConfirmDialog
          {...base}
          pending={pending}
          onKeep={vi.fn()}
          onConfirm={() => {
            onConfirm();
            setPending(true);
          }}
        />
      );
    }
    const onConfirm = vi.fn();
    render(<Host />);
    const confirm = screen.getByRole('button', { name: 'Delete award' });
    await userEvent.click(confirm);
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveAttribute('aria-busy', 'true');
  });

  it('while it runs nothing closes it: Keep it, the close button and Escape are off', async () => {
    const onKeep = vi.fn();
    render(<ConfirmDialog {...base} pending onKeep={onKeep} onConfirm={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    expect(onKeep).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('with onDismissWhilePending, closing while it runs dismisses instead of keeping', async () => {
    const onKeep = vi.fn();
    const onDismiss = vi.fn();
    render(
      <ConfirmDialog
        {...base}
        pending
        onKeep={onKeep}
        onConfirm={vi.fn()}
        onDismissWhilePending={onDismiss}
      />,
    );
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onDismiss).toHaveBeenCalledTimes(2);
    expect(onKeep).not.toHaveBeenCalled();
  });

  it('shows the pending label while it runs', () => {
    render(
      <ConfirmDialog {...base} pending pendingLabel="Deleting…" onKeep={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Deleting…' })).toHaveAttribute('aria-busy', 'true');
  });

  it('an error is announced inside the dialog, and both choices work again', async () => {
    const onKeep = vi.fn();
    render(
      <ConfirmDialog
        {...base}
        error="We couldn’t delete it. Try again."
        onKeep={onKeep}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t delete it. Try again.');
    expect(screen.getByRole('alertdialog')).toContainElement(screen.getByRole('alert'));
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  it('a non-destructive confirm is filled blue, a destructive one red', () => {
    const { rerender } = render(<ConfirmDialog {...base} onKeep={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Delete award' }).className).toMatch(/destructive/);
    rerender(
      <ConfirmDialog
        {...base}
        tone="default"
        icon="star"
        confirmLabel="Feature this instead"
        onKeep={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Feature this instead' }).className).toMatch(/primary/);
  });
});
