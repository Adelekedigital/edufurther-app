import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.getByRole('textbox', { name: 'Headline' })).toHaveAttribute('maxLength', '300');
  });

  it('saves what was typed', async () => {
    const { user, onSave } = setup();
    const headline = screen.getByRole('textbox', { name: 'Headline' });
    await user.clear(headline);
    await user.type(headline, 'MSc Public Health');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ ...initial, headline: 'MSc Public Health' });
  });

  it('won’t save without a first name', async () => {
    const { user, onSave } = setup();
    await user.clear(screen.getByRole('textbox', { name: 'First name' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(onSave).not.toHaveBeenCalled();
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
    expect(screen.getByRole('alert')).toHaveTextContent('Nope.');
  });

  it('while saving: "Saving…", and no second save', () => {
    setup({ saving: true });
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});
