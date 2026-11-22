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

  it('five open days a page: › shows the next five and chooses the first; no scrolling', async () => {
    const many = Array.from({ length: 7 }, (_, i) => {
      const date = `2026-11-${String(21 + i).padStart(2, '0')}`;
      return { date, slots: [{ startsAt: `${date}T10:00:00Z` }] };
    });
    const { user, onDayChange } = setup({ days: many });
    const names = () =>
      screen
        .getAllByRole('radio', { name: /^\w{3}, \w{3} \d+$/ })
        .map((r) => r.getAttribute('aria-label'));
    expect(names()).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Earlier dates' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    // The page's first day (index 5) is chosen; the parent re-renders on it.
    expect(onDayChange).toHaveBeenCalledWith(5);
  });

  it('the page holds the chosen day: its days only, › off on the last page', () => {
    const many = Array.from({ length: 7 }, (_, i) => {
      const date = `2026-11-${String(21 + i).padStart(2, '0')}`;
      return { date, slots: [{ startsAt: `${date}T10:00:00Z` }] };
    });
    setup({ days: many, dayIndex: 6 });
    expect(
      screen
        .getAllByRole('radio', { name: /^\w{3}, \w{3} \d+$/ })
        .map((r) => r.getAttribute('aria-label')),
    ).toEqual(['Thu, Nov 26', 'Fri, Nov 27']);
    expect(screen.getByRole('radio', { name: 'Fri, Nov 27' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Later dates' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Earlier dates' })).toBeEnabled();
  });
});
