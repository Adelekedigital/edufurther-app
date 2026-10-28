import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioChips } from './RadioChips';

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <RadioChips label="Pick" options={OPTIONS} value={value} onChange={setValue} focusKey="pick" />
  );
}

describe('RadioChips', () => {
  it('a radio group: one tab stop, the first when none is chosen', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Pick' })).toHaveAttribute(
      'aria-required',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Beta' })).toHaveAttribute('tabindex', '-1');
  });

  it('a filter (required off, the dark look) is not announced as required', () => {
    render(
      <RadioChips
        label="Filter"
        look="dark"
        required={false}
        options={OPTIONS}
        value="a"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Filter' })).not.toHaveAttribute('aria-required');
    expect(screen.getByRole('radio', { name: 'Alpha' })).toBeChecked();
  });

  it('Tab enters at the chosen one; arrows move and choose, wrapping', async () => {
    render(<Harness initial="b" />);
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Beta' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Gamma' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Gamma' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Gamma' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: 'Beta' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Home and End jump to the ends', async () => {
    render(<Harness initial="b" />);
    await userEvent.tab();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Gamma' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveAttribute('aria-checked', 'true');
  });

  it('the required-field focus target is the tab stop, not the group', () => {
    render(<Harness initial="c" />);
    expect(document.querySelector('[data-ff="pick"]')).toBe(
      screen.getByRole('radio', { name: 'Gamma' }),
    );
  });
});
