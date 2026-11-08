import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwitchRow } from './SwitchRow';

describe('SwitchRow', () => {
  it('the switch is named by the label and described by the hint', async () => {
    const onChange = vi.fn();
    render(
      <SwitchRow label="Message emails" hint="Once a day" checked={false} onChange={onChange} />,
    );
    const sw = screen.getByRole('switch', { name: 'Message emails' });
    expect(sw).toHaveAccessibleDescription('Once a day');
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('loading: a skeleton, no switch yet', () => {
    render(<SwitchRow label="L" checked={false} onChange={vi.fn()} loading />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('busy: waits and says so', () => {
    render(<SwitchRow label="L" checked onChange={vi.fn()} busy />);
    const sw = screen.getByRole('switch', { name: 'L' });
    expect(sw).toBeDisabled();
    expect(sw).toHaveAttribute('aria-busy', 'true');
  });

  it('noSwitch: the text alone', () => {
    render(<SwitchRow label="L" hint="Blocked" checked={false} onChange={vi.fn()} noSwitch />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it("a heading label, and each design's classes in place of the defaults", () => {
    render(
      <SwitchRow
        label="Notifications"
        labelAs="h2"
        checked={false}
        onChange={vi.fn()}
        classes={{ row: 'r', label: 'l' }}
      />,
    );
    const h = screen.getByRole('heading', { level: 2, name: 'Notifications' });
    expect(h).toHaveClass('l');
    expect(h.closest('.r')).not.toBeNull();
  });
});
