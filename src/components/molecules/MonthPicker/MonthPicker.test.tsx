import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthPicker } from './MonthPicker';

describe('MonthPicker, read-only (Month at a glance)', () => {
  it('names the month and says what each day is', () => {
    render(
      <MonthPicker
        readOnly
        today="2026-10-01"
        selected={['2026-10-12']}
        booked={['2026-10-04']}
        available={[1]}
        showLegend
      />,
    );
    expect(screen.getByRole('table', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByText('Monday, October 12, blocked')).toBeInTheDocument();
    expect(screen.getByText('Sunday, October 4, session booked')).toBeInTheDocument();
    expect(screen.getByText('Monday, October 5, open for bookings')).toBeInTheDocument();
    // Nothing to pick: no day is a button.
    expect(screen.queryByRole('button', { name: /October 12/ })).toBeNull();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Booked')).toBeInTheDocument();
  });

  it('pages forward and back, never before this month', async () => {
    const user = userEvent.setup();
    render(<MonthPicker readOnly today="2026-12-20" />);
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('table', { name: 'January 2027' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('table', { name: 'December 2026' })).toBeInTheDocument();
  });
});

describe('MonthPicker, pickable', () => {
  it('is one tab stop; arrows move by day and week, into the next month', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<MonthPicker today="2026-10-29" onPick={onPick} />);
    // Previous month is off this month, so: Next month, then the days.
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: /Thursday, October 29/ })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /Friday, October 30/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Friday, November 6/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onPick).toHaveBeenCalledWith('2026-11-06');
  });

  it('a past day can be reached but not picked', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<MonthPicker today="2026-10-15" onPick={onPick} />);
    const past = screen.getByRole('button', { name: /October 14/ });
    expect(past).toHaveAttribute('aria-disabled', 'true');
    await user.click(past);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('marks blocked days pressed', () => {
    render(<MonthPicker today="2026-10-01" selected={['2026-10-12']} onPick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /October 12, blocked/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('MonthPicker onMonthChange', () => {
  it('reports the month on mount and as it pages', async () => {
    const onMonthChange = vi.fn();
    const user = userEvent.setup();
    render(<MonthPicker readOnly today="2026-10-15" onMonthChange={onMonthChange} />);
    expect(onMonthChange).toHaveBeenLastCalledWith('2026-10-01');
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onMonthChange).toHaveBeenLastCalledWith('2026-11-01');
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onMonthChange).toHaveBeenLastCalledWith('2026-10-01');
  });
});
