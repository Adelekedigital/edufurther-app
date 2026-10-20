import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FrozenGroup } from './FrozenGroup';

describe('FrozenGroup', () => {
  it('frozen: its controls are disabled and Tab skips them', async () => {
    render(
      <>
        <input aria-label="Name" />
        <FrozenGroup frozen className="field">
          <input aria-label="Headline" />
        </FrozenGroup>
        <select aria-label="Gender" />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Headline' })).toBeDisabled();
    screen.getByRole('textbox', { name: 'Name' }).focus();
    await userEvent.tab();
    expect(screen.getByRole('combobox', { name: 'Gender' })).toHaveFocus();
  });

  it('not frozen: a plain wrapper with the caller’s class, controls live', () => {
    const { container } = render(
      <FrozenGroup frozen={false} className="field">
        <input aria-label="Headline" />
      </FrozenGroup>,
    );
    expect(container.querySelector('fieldset')).toBeNull();
    expect(container.firstElementChild).toHaveClass('field');
    expect(screen.getByRole('textbox', { name: 'Headline' })).toBeEnabled();
  });
});
