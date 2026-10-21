import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BOOKING_COPY } from '@/lib/copy/mentorSettings';
import { BookingRulesRows } from './BookingRulesRows';

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
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Minimum notice' }), '48');
    expect(onChange).toHaveBeenCalledWith({
      durationMin: 60,
      noticeHours: 48,
      windowDays: 28,
      breakMin: 15,
    });
  });
});
