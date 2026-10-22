import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hasUnsavedChanges, unsavedLabel } from '@/lib/utils/leaveGuard';
import { IntroEditForm } from './IntroEditForm';

const initial = { firstName: 'Gbenga', lastName: 'Elufisan', headline: 'PhD Sociology' };

function setup(extra: Partial<Parameters<typeof IntroEditForm>[0]> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(
    <IntroEditForm
      initial={initial}
      onSave={onSave}
      onCancel={onCancel}
      saving={false}
      {...extra}
    />,
  );
  return { user, onSave, onCancel };
}

describe('IntroEditForm', () => {
  it('opens on the first name, filled in, with the server’s limits', () => {
    setup();
    const first = screen.getByRole('textbox', { name: 'First name' });
    expect(first).toHaveFocus();
    expect(first).toHaveValue('Gbenga');
    expect(first).toHaveAttribute('maxLength', '100');
    expect(screen.getByRole('textbox', { name: 'Last name' })).toHaveAttribute('maxLength', '100');
    expect(screen.getByRole('textbox', { name: 'Headline' })).toHaveAttribute('maxLength', '80');
  });

  it('saves what was typed', async () => {
    const { user, onSave } = setup();
    const headline = screen.getByRole('textbox', { name: 'Headline' });
    await user.clear(headline);
    await user.type(headline, 'MSc Public Health');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ ...initial, headline: 'MSc Public Health' });
  });

  describe('the shared form rule (Settings, PR 325)', () => {
    it('Save with gaps: the line by Save, an error on each field, focus on the first, nothing sent', async () => {
      const { user, onSave } = setup();
      for (const name of ['First name', 'Last name', 'Headline'])
        await user.clear(screen.getByRole('textbox', { name }));
      const save = screen.getByRole('button', { name: 'Save' });
      expect(save).not.toHaveAttribute('aria-disabled');
      await user.click(save);
      expect(onSave).not.toHaveBeenCalled();
      // Each field's FieldError is an alert too; the form line is one of them.
      expect(screen.getByText('Fill in the required fields to continue.')).toHaveAttribute(
        'role',
        'alert',
      );
      expect(screen.getByRole('textbox', { name: 'First name' })).toHaveAccessibleDescription(
        'Add your first name.',
      );
      expect(screen.getByRole('textbox', { name: 'Last name' })).toHaveAccessibleDescription(
        'Add your last name.',
      );
      expect(screen.getByRole('textbox', { name: 'Headline' })).toHaveAccessibleDescription(
        'Add a headline.',
      );
      await waitFor(() =>
        expect(screen.getByRole('textbox', { name: 'First name' })).toHaveFocus(),
      );
    });

    it('errors follow the fields as they’re fixed, then it saves', async () => {
      const { user, onSave } = setup();
      const last = screen.getByRole('textbox', { name: 'Last name' });
      await user.clear(last);
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(last).toHaveAccessibleDescription('Add your last name.');
      await user.type(last, 'Ade');
      expect(last).not.toHaveAccessibleDescription();
      expect(screen.queryByRole('alert')).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSave).toHaveBeenCalledWith({ ...initial, lastName: 'Ade' });
    });

    it('an older headline over 80, edited and still over: says to keep it to 80', async () => {
      const { user, onSave } = setup({ initial: { ...initial, headline: 'y'.repeat(120) } });
      const headline = screen.getByRole('textbox', { name: 'Headline' });
      // The input stops new typing at 80; an older, longer one can still be edited.
      expect(headline).toHaveAttribute('maxLength', '80');
      await user.type(headline, '{Backspace}');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSave).not.toHaveBeenCalled();
      expect(headline).toHaveAccessibleDescription('Keep your headline to 80 characters.');
    });

    it('an unchanged older headline over 80 still saves', async () => {
      const long = 'y'.repeat(120);
      const { user, onSave } = setup({ initial: { ...initial, headline: long } });
      await user.type(screen.getByRole('textbox', { name: 'Last name' }), 'x');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSave).toHaveBeenCalledWith({ ...initial, lastName: 'Elufisanx', headline: long });
    });
  });

  describe('in review: the headline holds still (owner, 21 Oct)', () => {
    it('frozen while open: an edited headline goes back to the saved one, which is what saves', async () => {
      const onSave = vi.fn();
      const user = userEvent.setup();
      const props = { initial, onSave, onCancel: vi.fn(), saving: false };
      const { rerender } = render(<IntroEditForm {...props} />);
      const headline = screen.getByRole('textbox', { name: 'Headline' });
      await user.clear(headline);
      await user.type(headline, 'Edited');
      rerender(<IntroEditForm {...props} headlineFrozen />);
      expect(screen.getByRole('textbox', { name: 'Headline' })).toHaveValue(initial.headline);
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSave).toHaveBeenCalledWith(initial);
    });

    it('the headline can’t be changed or block the save; the names save', async () => {
      const { user, onSave } = setup({
        headlineFrozen: true,
        initial: { ...initial, headline: '' },
      });
      expect(screen.getByRole('textbox', { name: 'Headline' })).toBeDisabled();
      await user.type(screen.getByRole('textbox', { name: 'Last name' }), 'x');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSave).toHaveBeenCalledWith({ ...initial, lastName: 'Elufisanx', headline: '' });
    });
  });

  it('a failed save puts focus on the first field it names; typing elsewhere keeps focus', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <IntroEditForm initial={initial} onSave={onSave} onCancel={vi.fn()} saving={false} />,
    );
    const headline = screen.getByRole('textbox', { name: 'Headline' });
    rerender(
      <IntroEditForm
        initial={initial}
        onSave={onSave}
        onCancel={vi.fn()}
        saving={false}
        errors={{ headline: 'Keep your headline under 300 characters.' }}
      />,
    );
    expect(headline).toHaveFocus();
    const last = screen.getByRole('textbox', { name: 'Last name' });
    await user.click(last);
    await user.type(last, 'x');
    // Same errors, a new object each render: focus stays where the owner is.
    rerender(
      <IntroEditForm
        initial={initial}
        onSave={onSave}
        onCancel={vi.fn()}
        saving={false}
        errors={{ headline: 'Keep your headline under 300 characters.' }}
      />,
    );
    expect(last).toHaveFocus();
  });

  it('Escape and Cancel cancel', async () => {
    const { user, onCancel } = setup();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('shows field errors on their fields and a general one as an alert', () => {
    setup({ errors: { headline: 'Keep your headline under 300 characters.', general: 'Nope.' } });
    expect(screen.getByRole('textbox', { name: 'Headline' })).toHaveAccessibleDescription(
      /under 300 characters/,
    );
    expect(screen.getByRole('textbox', { name: 'Headline' })).toBeInvalid();
    expect(screen.getByText('Nope.')).toHaveAttribute('role', 'alert');
  });

  it('while saving: "Saving…", and no second save (the button keeps focus)', async () => {
    const { user, onSave } = setup({ saving: true });
    const btn = screen.getByRole('button', { name: 'Saving…' });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    await user.click(btn);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('an edit counts as unsaved (leaving asks first: links, Logout, the browser); undoing it doesn’t', async () => {
    const { user } = setup();
    expect(hasUnsavedChanges()).toBe(false);
    const box = screen.getByRole('textbox', { name: 'Headline' });
    await user.type(box, ' at LSE');
    expect(hasUnsavedChanges()).toBe(true);
    expect(unsavedLabel()).toBe('your intro');
    for (let n = 0; n < 7; n++) await user.type(box, '{Backspace}');
    expect(hasUnsavedChanges()).toBe(false);
  });
});
