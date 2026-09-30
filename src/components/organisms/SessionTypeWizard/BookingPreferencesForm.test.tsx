import { render, screen, within } from '@testing-library/react';
import type { BookingDefaults } from '@/lib/utils/sessionTypeDraft';
import { BookingPreferencesForm } from './BookingPreferencesForm';

const initial = (over: Partial<BookingDefaults> = {}): BookingDefaults => ({
  durationMin: 45,
  noticeHours: 48,
  windowDays: 56,
  breakMin: 10,
  requiresApproval: true,
  maxWindowDays: 56,
  ...over,
});
const el = (i: BookingDefaults) => (
  <BookingPreferencesForm
    initial={i}
    saving={false}
    error={null}
    onCancel={vi.fn()}
    onSave={vi.fn()}
  />
);

describe('BookingPreferencesForm: the platform cap', () => {
  it('a lower cap arriving while it’s open brings the window within it and keeps the other choices', () => {
    const { rerender } = render(el(initial()));
    rerender(el(initial({ maxWindowDays: 14 })));
    const window = screen.getByRole('combobox', { name: 'Bookable up to' });
    expect(window).toHaveValue('14');
    expect(
      within(window)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['1 week', '2 weeks']);
    expect(screen.getByRole('combobox', { name: 'Session length' })).toHaveValue('45');
  });
});
