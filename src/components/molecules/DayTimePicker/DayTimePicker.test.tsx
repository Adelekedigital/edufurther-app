import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayTimePicker } from './DayTimePicker';

const days = [
  { date: '2026-11-25', slots: [{ startsAt: '2026-11-25T10:00:00Z' }] },
  { date: '2026-11-28', slots: [{ startsAt: '2026-11-28T13:00:00Z' }] },
];
const setup = (over: Partial<Parameters<typeof DayTimePicker>[0]> = {}) => {
  const onDayChange = vi.fn();
  const onTimeChange = vi.fn();
  render(
    <DayTimePicker
      days={days}
      dayIndex={0}
      onDayChange={onDayChange}
      time={null}
      onTimeChange={onTimeChange}
      timeZone="UTC"
      {...over}
    />,
  );
  return { onDayChange, onTimeChange, user: userEvent.setup() };
};

describe('DayTimePicker (open days only, owner 2026-11-21)', () => {
  it('names each day by weekday and date only, with no count and no empty days', () => {
    setup();
    expect(
      screen
        .getAllByRole('radio', { name: /^\w{3}, \w{3} \d+$/ })
        .map((r) => r.getAttribute('aria-label')),
    ).toEqual(['Wed, Nov 25', 'Sat, Nov 28']);
    expect(screen.queryByText(/available|times?\b/)).toBeNull();
    expect(screen.getByRole('radio', { name: 'Wed, Nov 25' })).toBeChecked();
  });

  it('picking a day or a time reports it', async () => {
    const { user, onDayChange, onTimeChange } = setup();
    await user.click(screen.getByRole('radio', { name: 'Sat, Nov 28' }));
    expect(onDayChange).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole('radio', { name: '10:00 am' }));
    expect(onTimeChange).toHaveBeenCalledWith('2026-11-25T10:00:00Z');
  });

  it('‹ › scroll the row; at either end they are off', async () => {
    const { user } = setup();
    const back = screen.getByRole('button', { name: 'Earlier dates' });
    const on = screen.getByRole('button', { name: 'Later dates' });
    // jsdom has no layout: the row fits, so both ends are reached.
    expect(back).toBeDisabled();
    expect(on).toBeDisabled();
    const row = screen.getByRole('radio', { name: 'Wed, Nov 25' }).closest('div')!;
    Object.defineProperty(row, 'scrollWidth', { configurable: true, value: 600 });
    Object.defineProperty(row, 'clientWidth', { configurable: true, value: 300 });
    row.scrollBy = vi.fn();
    row.dispatchEvent(new Event('scroll'));
    expect(await screen.findByRole('button', { name: 'Later dates' })).toBeEnabled();
    await user.click(on);
    expect(row.scrollBy).toHaveBeenCalledWith({ left: 240, behavior: 'smooth' });
  });
});
