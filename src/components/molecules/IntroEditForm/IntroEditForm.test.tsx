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

  it('a blank first name still saves: the save says why it can’t (review of #78)', async () => {
    const { user, onSave } = setup();
    await user.clear(screen.getByRole('textbox', { name: 'First name' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ ...initial, firstName: '' });
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
    expect(screen.getByRole('alert')).toHaveTextContent('Nope.');
  });

  it('while saving: "Saving…", and no second save (the button keeps focus)', async () => {
    const { user, onSave } = setup({ saving: true });
    const btn = screen.getByRole('button', { name: 'Saving…' });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    await user.click(btn);
    expect(onSave).not.toHaveBeenCalled();
  });
});
