import { render, screen } from '@testing-library/react';
import { emptyWeek, type DayHours } from '@/lib/utils/sessionTypeDraft';
import { WeeklyHoursCard } from './WeeklyHoursCard';

const days: DayHours[] = emptyWeek().map((d, i) =>
  i === 1 ? { on: true, slots: [[540, 600]] } : d,
) as DayHours[];

const card = (collapsible: boolean) => (
  <WeeklyHoursCard
    days={days}
    onDays={vi.fn()}
    timeZone="Africa/Lagos"
    onTimeZone={vi.fn()}
    deviceZone="Africa/Lagos"
    collapsible={collapsible}
  />
);

describe('WeeklyHoursCard across the phone breakpoint', () => {
  it('phone to desktop with focus inside: the heading takes it, not the page', () => {
    const { rerender } = render(card(true));
    screen.getByRole('button', { name: 'Weekly availability' }).focus();
    rerender(card(false));
    expect(screen.getByRole('heading', { name: 'Weekly availability' })).toHaveFocus();
  });

  it('desktop to phone with focus inside: the section header takes it', () => {
    const { rerender } = render(card(false));
    screen.getByRole('switch', { name: 'Monday' }).focus();
    rerender(card(true));
    expect(screen.getByRole('button', { name: 'Weekly availability' })).toHaveFocus();
  });

  it('focus elsewhere stays where it is', () => {
    const { rerender } = render(
      <>
        <button type="button">Outside</button>
        {card(true)}
      </>,
    );
    screen.getByRole('button', { name: 'Outside' }).focus();
    rerender(
      <>
        <button type="button">Outside</button>
        {card(false)}
      </>,
    );
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
  });
});
