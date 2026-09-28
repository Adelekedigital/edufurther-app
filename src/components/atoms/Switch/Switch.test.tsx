import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

function Harness() {
  const [on, setOn] = useState(false);
  return <Switch checked={on} onChange={setOn} aria-label="SOP draft review is live" />;
}

describe('Switch', () => {
  it('is a named switch that flips on click, Space and Enter', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'SOP draft review is live' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    await user.keyboard(' ');
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await user.keyboard('{Enter}');
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('does nothing while disabled', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} aria-label="Live" disabled />);
    await userEvent.setup().click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
