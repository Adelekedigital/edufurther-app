import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  it('opens on the text with the cursor at the end, capped at 600, counting', async () => {
    const { user } = setup();
    const box = screen.getByRole('textbox', { name: 'About' });
    expect(box).toHaveFocus();
    expect(box).toHaveAttribute('maxLength', '600');
    expect(screen.getByText('7 / 600')).toBeInTheDocument();
    await user.type(box, ' More');
    expect(box).toHaveValue('I help. More');
    expect(screen.getByText('12 / 600')).toBeInTheDocument();
  });

  it('Save sends the text; Escape and Cancel cancel', async () => {
    const { user, onSave, onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('I help.');
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
    expect(box).toHaveAccessibleDescription('That didn’t save. Try again.');
    expect(box).toHaveFocus();
  });
});
