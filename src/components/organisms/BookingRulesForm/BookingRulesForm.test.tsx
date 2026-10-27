import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyWeek, type BookingDefaults, type DayHours } from '@/lib/utils/sessionTypeDraft';
import { BookingRulesForm } from './BookingRulesForm';
import { pickOption } from '@/test-utils/select';

const initial: BookingDefaults = {
  durationMin: 60,
  noticeHours: 24,
  windowDays: 28,
  breakMin: 15,
  requiresApproval: false,
  maxWindowDays: 56,
};

const form = (over: Partial<BookingDefaults> = {}, onSave = vi.fn(), days: DayHours[] = []) =>
  render(
    <BookingRulesForm
      initial={{ ...initial, ...over }}
      days={days}
      saving={false}
      error={null}
      onCancel={vi.fn()}
      onSave={onSave}
    />,
  );

describe('BookingRulesForm', () => {
  it('Approve bookings first, then the four rules in Settings’ words, each described by its hint', () => {
    form();
    const approve = screen.getByRole('switch', { name: 'Approve bookings' });
    expect(approve).not.toBeChecked();
    expect(approve).toHaveAccessibleDescription(
      'Off: mentees book your open times and they’re confirmed straight away.',
    );
    for (const name of [
      'Session length',
      'Minimum notice',
      'Booking window',
      'Buffer between sessions',
    ])
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Booking window' })).toHaveAccessibleDescription(
      'How far in advance mentees can book you.',
    );
    // The switch comes before every select.
    const [first] = screen.getAllByRole('combobox');
    expect(approve.compareDocumentPosition(first!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('turning approval on says what it means and saves it with the rules', async () => {
    const onSave = vi.fn();
    form({ responseWindowHours: 12 }, onSave);
    await userEvent.click(screen.getByRole('switch', { name: 'Approve bookings' }));
    expect(screen.getByRole('switch', { name: 'Approve bookings' })).toHaveAccessibleDescription(
      'You accept each request first. If it’s still waiting 12 hours before the session, it expires and the mentee is told.',
    );
    await pickOption(userEvent, screen.getByRole('combobox', { name: 'Session length' }), '90');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ durationMin: 90, requiresApproval: true }),
    );
  });

  it('turning approval off saves it off', async () => {
    const onSave = vi.fn();
    form({ requiresApproval: true }, onSave);
    await userEvent.click(screen.getByRole('switch', { name: 'Approve bookings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ requiresApproval: false }));
  });

  it('points to Settings in a new tab, the whole line the link, so the rules being edited stay', () => {
    form();
    const link = screen.getByRole('link', {
      name: 'Manage your booking rules in Settings (opens in a new tab)',
    });
    expect(link).toHaveAttribute('href', '/settings/booking');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('says when the weekly hours can’t fit the chosen length', async () => {
    const days = emptyWeek().map((d, i) =>
      i === 1 ? { on: true, slots: [[540, 600]] } : d,
    ) as DayHours[];
    form({}, vi.fn(), days);
    expect(
      screen.queryByText(
        'Your weekly hours are too short for this session length. Add longer hours or pick a shorter length.',
      ),
    ).not.toBeInTheDocument();
    await pickOption(userEvent, screen.getByRole('combobox', { name: 'Session length' }), '90');
    expect(
      screen.getByText(
        'Your weekly hours are too short for this session length. Add longer hours or pick a shorter length.',
      ),
    ).toBeInTheDocument();
  });

  it('a window above the platform’s cap shows and saves the cap', async () => {
    const onSave = vi.fn();
    form({ windowDays: 90, maxWindowDays: 56 }, onSave);
    expect(screen.getByRole('combobox', { name: 'Booking window' })).toHaveValue('56');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ windowDays: 56 }));
  });

  it('values set elsewhere (21 days, 36 hours) stay selected', () => {
    form({ windowDays: 21, noticeHours: 36 });
    expect(screen.getByRole('combobox', { name: 'Booking window' })).toHaveValue('21');
    expect(screen.getByRole('combobox', { name: 'Minimum notice' })).toHaveValue('36');
  });
});
