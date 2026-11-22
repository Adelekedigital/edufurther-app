import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BOOKING_COPY } from '@/lib/copy/mentorSettings';
import { BookingRulesRows } from './BookingRulesRows';
import { pickOption } from '@/test-utils/select';

describe('BookingRulesRows', () => {
  // A caller may pass a wider object (the session wizard passes its whole
  // draft); a change must patch only the four rules, or it rewrites the rest.
  it('a change sends only the four rules, the changed one updated', async () => {
    const onChange = vi.fn();
    const value = {
      durationMin: 60,
      noticeHours: 24,
      windowDays: 28,
      breakMin: 15,
      name: 'SOP review',
      days: [],
    };
    render(
      <BookingRulesRows
        value={value}
        copy={BOOKING_COPY.rules}
        onChange={onChange}
        classes={{}}
        selectWidth={150}
      />,
    );
    await pickOption(userEvent, screen.getByRole('combobox', { name: 'Minimum notice' }), '48');
    expect(onChange).toHaveBeenCalledWith({
      durationMin: 60,
      noticeHours: 48,
      windowDays: 28,
      breakMin: 15,
    });
  });
});

describe('BookingRulesRows: the booking window past two weeks (owner 2026-11-21)', () => {
  const rows = (windowDays: number) =>
    render(
      <BookingRulesRows
        value={{ durationMin: 60, noticeHours: 24, windowDays, breakMin: 15 }}
        copy={BOOKING_COPY.rules}
        onChange={vi.fn()}
        classes={{}}
        selectWidth={150}
      />,
    );

  it('says what it costs over 14 days, as part of the field’s description', () => {
    rows(28);
    expect(screen.getByRole('combobox', { name: 'Booking window' })).toHaveAccessibleDescription(
      `${BOOKING_COPY.rules.windowDays.hint} ${BOOKING_COPY.longWindow}`,
    );
  });

  it('says nothing more at 14 days or less', () => {
    rows(14);
    expect(screen.queryByText(new RegExp(BOOKING_COPY.longWindow))).toBeNull();
  });
});
