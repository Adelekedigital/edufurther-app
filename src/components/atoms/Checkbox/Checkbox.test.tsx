import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('is a native checkbox named by its label, toggled by click and Space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <label>
        <Checkbox checked={false} onChange={onChange} />
        Compare with previous period
      </label>,
    );
    const box = screen.getByRole('checkbox', { name: 'Compare with previous period' });
    await user.click(box);
    expect(onChange).toHaveBeenCalledTimes(1);
    box.focus();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('forwards its ref and native props, and sizes by prop', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Checkbox ref={ref} size={18} aria-label="Select Ada" defaultChecked className="extra" />,
    );
    const box = screen.getByRole('checkbox', { name: 'Select Ada' });
    expect(ref.current).toBe(box);
    expect(box).toBeChecked();
    expect(box.className).toMatch(/s18/);
    expect(box.className).toMatch(/extra/);
  });

  it('leaves the focus ring to its label when told to', () => {
    render(<Checkbox aria-label="I study here now" focusRing="parent" readOnly />);
    expect(screen.getByRole('checkbox').className).toMatch(/parentRing/);
  });
});
