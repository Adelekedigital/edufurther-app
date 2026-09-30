import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { CountryPicker } from './CountryPicker';

const options = [
  { id: 'ci', label: 'Côte d’Ivoire' },
  { id: 'gh', label: 'Ghana' },
  { id: 'ng', label: 'Nigeria' },
  { id: 'ne', label: 'Niger' },
];

function Harness({ onChange = vi.fn(), onKeyDown = vi.fn() }) {
  const [v, setV] = useState('gh');
  return (
    <div onKeyDown={onKeyDown}>
      <label htmlFor="c">From</label>
      <CountryPicker
        id="c"
        invalid={false}
        options={options}
        value={v}
        onChange={(id) => {
          setV(id);
          onChange(id);
        }}
      />
    </div>
  );
}

describe('CountryPicker', () => {
  it('shows the chosen country; typing narrows the list (accents ignored)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: 'From' });
    expect(box).toHaveValue('Ghana');
    await user.clear(box);
    await user.type(box, 'cote');
    expect(box).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Côte d’Ivoire']);
  });

  it('arrow keys move through the matches and Enter picks, without submitting', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const box = screen.getByRole('combobox', { name: 'From' });
    await user.clear(box);
    await user.type(box, 'nige');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('ne');
    expect(box).toHaveValue('Niger');
    expect(box).toHaveAttribute('aria-expanded', 'false');
  });

  it('a click picks', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole('combobox', { name: 'From' }));
    await user.click(screen.getByRole('option', { name: 'Nigeria' }));
    expect(onChange).toHaveBeenCalledWith('ng');
  });

  it('Escape closes the list only; the modal doesn’t hear it', async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    render(<Harness onKeyDown={outer} />);
    const box = screen.getByRole('combobox', { name: 'From' });
    await user.type(box, 'x');
    await user.keyboard('{Escape}');
    expect(box).toHaveAttribute('aria-expanded', 'false');
    expect(box).toHaveValue('Ghana');
    expect(outer.mock.calls.some(([e]) => e.key === 'Escape')).toBe(false);
  });

  it('leaving without picking puts the chosen country back; no match says so', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: 'From' });
    await user.clear(box);
    await user.type(box, 'zzz');
    expect(screen.getByRole('status')).toHaveTextContent('No countries match “zzz”.');
    await user.tab();
    expect(box).toHaveValue('Ghana');
  });

  it('the list is named, holds only options, and opening highlights the chosen one (review of #85)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole('combobox', { name: 'From' });
    await user.click(box);
    const list = screen.getByRole('listbox', { name: 'Countries' });
    expect(box).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Ghana' }).id,
    );
    await user.clear(box);
    await user.type(box, 'zzz');
    expect(list.querySelectorAll(':scope > :not([role="option"])')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('No countries match “zzz”.');
  });
});
