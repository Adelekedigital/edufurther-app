import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BookingDefaults } from '@/lib/utils/sessionTypeDraft';
import { SchedulingWindowForm } from './SchedulingWindowForm';

const initial: BookingDefaults = {
  durationMin: 60,
  noticeHours: 24,
  windowDays: 28,
  breakMin: 15,
  requiresApproval: false,
  maxWindowDays: 56,
};

const form = (over: Partial<BookingDefaults> = {}, onSave = vi.fn()) =>
  render(
    <SchedulingWindowForm
      initial={{ ...initial, ...over }}
      days={[]}
      saving={false}
      error={null}
      onCancel={vi.fn()}
      onSave={onSave}
    />,
  );

describe('SchedulingWindowForm', () => {
  it('Calendar’s four rows, in Calendar’s words, each described by its hint', () => {
    form();
    for (const name of ['Session length', 'Minimum notice', 'Book up to', 'Break between sessions'])
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Book up to' })).toHaveAccessibleDescription(
      'How far ahead your calendar is open.',
    );
  });

  it('a change saves with approval as it was', async () => {
    const onSave = vi.fn();
    form({}, onSave);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Session length' }), '90');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ durationMin: 90, requiresApproval: false }),
    );
  });

  it('a window above the platform’s cap shows and saves the cap', async () => {
    const onSave = vi.fn();
    form({ windowDays: 90, maxWindowDays: 56 }, onSave);
    expect(screen.getByRole('combobox', { name: 'Book up to' })).toHaveValue('56');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ windowDays: 56 }));
  });

  it('values set elsewhere (21 days, 36 hours) stay selected', () => {
    form({ windowDays: 21, noticeHours: 36 });
    expect(screen.getByRole('combobox', { name: 'Book up to' })).toHaveValue('21');
    expect(screen.getByRole('combobox', { name: 'Minimum notice' })).toHaveValue('36');
  });
});
