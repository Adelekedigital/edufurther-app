import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hasUnsavedChanges, unsavedLabel } from '@/lib/utils/leaveGuard';
import { AboutEditor } from './AboutEditor';

function setup(extra: Partial<Parameters<typeof AboutEditor>[0]> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(
    <AboutEditor initial="I help." onSave={onSave} onCancel={onCancel} saving={false} {...extra} />,
  );
  return { user, onSave, onCancel };
}

describe('AboutEditor', () => {
  it('opens on the text with the cursor at the end, capped at 1,500 (owner, 2026-10-17), counting', async () => {
    const { user } = setup();
    const box = screen.getByRole('textbox', { name: 'About' });
    expect(box).toHaveFocus();
    expect(box).toHaveAttribute('maxLength', '1500');
    expect(screen.getByText('7/1500')).toBeInTheDocument();
    await user.type(box, ' More');
    expect(box).toHaveValue('I help. More');
    expect(screen.getByText('12/1500')).toBeInTheDocument();
  });

  it('Save sends the text; Escape and Cancel cancel', async () => {
    const { user, onSave, onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('I help.', { drafted: false, promptVersion: null });
    screen.getByRole('textbox', { name: 'About' }).focus();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('shows a failure, and "Saving…" while saving', () => {
    setup({ saving: true, error: 'That didn’t save. Try again.' });
    expect(screen.getByRole('alert')).toHaveTextContent('That didn’t save. Try again.');
    expect(screen.getByRole('button', { name: 'Saving…' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    const box = screen.getByRole('textbox', { name: 'About' });
    expect(box).toBeInvalid();
    // The failure is the textarea's description, and focus is back on it.
    expect(box).toHaveAccessibleDescription(
      expect.stringContaining('That didn’t save. Try again.'),
    );
    expect(box).toHaveFocus();
  });

  it('an edit counts as unsaved (leaving asks first: links, Logout, the browser); undoing it doesn’t', async () => {
    const { user } = setup();
    expect(hasUnsavedChanges()).toBe(false);
    const box = screen.getByRole('textbox', { name: 'About' });
    await user.type(box, ' More.');
    expect(hasUnsavedChanges()).toBe(true);
    expect(unsavedLabel()).toBe('your About section');
    for (let n = 0; n < 6; n++) await user.type(box, '{Backspace}');
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('a refetch that changes the saved text mid-edit isn’t counted as an edit', async () => {
    const { rerender } = render(
      <AboutEditor initial="One." onSave={vi.fn()} onCancel={vi.fn()} saving={false} />,
    );
    expect(hasUnsavedChanges()).toBe(false);
    rerender(<AboutEditor initial="Two." onSave={vi.fn()} onCancel={vi.fn()} saving={false} />);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('saves an untouched AI draft as drafted, with its prompt; editing a word clears it', async () => {
    const assist = vi.fn().mockResolvedValue({ text: 'A drafted About.', promptVersion: 'v1' });
    const { user, onSave } = setup({ initial: '', assist });
    await user.click(screen.getByRole('button', { name: 'Write a draft' }));
    expect(await screen.findByText('Drafted for you')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenLastCalledWith('A drafted About.', {
      drafted: true,
      promptVersion: 'v1',
    });
    await user.type(screen.getByRole('textbox', { name: 'About' }), ' Mine');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenLastCalledWith('A drafted About. Mine', {
      drafted: false,
      promptVersion: null,
    });
  });

  it('is a plain field without assist', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Write a draft|Improve/ })).toBeNull();
  });

  it('holds Save while an AI call runs', async () => {
    const assist = vi.fn(() => new Promise<never>(() => {}));
    const { user, onSave } = setup({ assist });
    await user.click(screen.getByRole('button', { name: 'Improve' }));
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await user.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });
});
