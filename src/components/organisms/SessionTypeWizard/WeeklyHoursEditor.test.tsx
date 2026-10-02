import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyWeek, type DayHours } from '@/lib/utils/sessionTypeDraft';
import { WeeklyHoursEditor } from './WeeklyHoursEditor';

function Harness({
  start,
  minLength,
  variant,
}: {
  start: DayHours[];
  minLength?: number;
  variant?: 'list' | 'compact';
}) {
  const [days, setDays] = useState(start);
  return (
    <WeeklyHoursEditor days={days} onChange={setDays} minLength={minLength} variant={variant} />
  );
}

const week = (monday: DayHours) => {
  const days = emptyWeek();
  days[1] = monday;
  return days;
};
const monday = () => screen.getByRole('group', { name: 'Monday' });
const times = (name: RegExp) =>
  within(monday())
    .getAllByRole('combobox', { name })
    .map((c) => (c as HTMLSelectElement).value);

describe('WeeklyHoursEditor: hours fit the shortest session', () => {
  it('Add hours makes a slot as long as a 90-min session', async () => {
    const user = userEvent.setup();
    render(<Harness start={week({ on: true, slots: [[540, 600]] })} minLength={90} />);
    await user.click(within(monday()).getByRole('button', { name: /Add hours/ }));
    expect(times(/start time/)).toEqual(['540', '660']);
    expect(times(/end time/)).toEqual(['600', '750']);
  });

  it('Add hours late in the day fits before midnight when it can', async () => {
    const user = userEvent.setup();
    render(<Harness start={week({ on: true, slots: [[1200, 1260]] })} minLength={90} />);
    await user.click(within(monday()).getByRole('button', { name: /Add hours/ }));
    expect(times(/start time/)[1]).toBe('1320');
    expect(times(/end time/)[1]).toBe('1410');
  });

  it('Add hours never overlaps the last slot; one too short to fit says so', async () => {
    const user = userEvent.setup();
    render(<Harness start={week({ on: true, slots: [[1320, 1380]] })} minLength={90} />);
    await user.click(within(monday()).getByRole('button', { name: /Add hours/ }));
    expect(times(/start time/)[1]).toBe('1380');
    expect(times(/end time/)[1]).toBe('1440');
    // Both are under 90 minutes: the saved 60-min slot and the new 11 pm one.
    expect(
      within(monday()).getAllByText('Too short for your 90-min sessions. Make it at least 90 min.'),
    ).toHaveLength(2);
  });

  it('start times leave room for a session before midnight', () => {
    render(<Harness start={week({ on: true, slots: [[540, 630]] })} minLength={90} />);
    const starts = within(
      within(monday()).getByRole('combobox', { name: /start time/ }),
    ).getAllByRole('option');
    expect((starts.at(-1) as HTMLOptionElement).value).toBe('1350');
  });

  it('Add hours with a 30-min minimum makes a 30-min slot (design add)', async () => {
    const user = userEvent.setup();
    render(<Harness start={week({ on: true, slots: [[540, 600]] })} minLength={30} />);
    await user.click(within(monday()).getByRole('button', { name: /Add hours/ }));
    expect(times(/start time/)).toEqual(['540', '660']);
    expect(times(/end time/)).toEqual(['600', '690']);
  });

  it('a day switched on gets slots long enough to book', async () => {
    const user = userEvent.setup();
    render(<Harness start={week({ on: false, slots: [[540, 600]] })} minLength={90} />);
    await user.click(within(monday()).getByRole('switch'));
    expect(times(/end time/)).toEqual(['630']);
  });

  it('a picked end stays as picked', async () => {
    const user = userEvent.setup();
    render(<Harness start={week({ on: true, slots: [[540, 600]] })} minLength={30} />);
    await user.selectOptions(within(monday()).getByRole('combobox', { name: /end time/ }), '570');
    expect(times(/end time/)).toEqual(['570']);
  });

  it('compact: a too-short slot says "Under 60 min", and the full reason to screen readers', () => {
    render(
      <Harness start={week({ on: true, slots: [[540, 570]] })} minLength={60} variant="compact" />,
    );
    expect(within(monday()).getByText('Under 60 min')).toBeInTheDocument();
    const end = within(monday()).getByRole('combobox', { name: /end time/ });
    expect(end).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(end.getAttribute('aria-describedby')!)).toHaveTextContent(
      'Too short for your 60-min sessions. Make it at least 60 min.',
    );
  });

  it('no minimum: behaves as before (every end time listed)', () => {
    render(<Harness start={week({ on: true, slots: [[540, 600]] })} />);
    expect(
      within(within(monday()).getByRole('combobox', { name: /end time/ })).getAllByRole('option'),
    ).toHaveLength(49);
  });
});
