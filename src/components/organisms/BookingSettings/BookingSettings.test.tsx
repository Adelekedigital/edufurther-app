import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { noResponseLine, rulesNote } from '@/lib/copy/mentorSettings';
import { BookingSettings, type BookingSettingsValue } from './BookingSettings';

const value: BookingSettingsValue = {
  requiresApproval: true,
  durationMin: 60,
  noticeHours: 24,
  windowDays: 14,
  breakMin: 15,
};

const ready = (over: Partial<BookingSettingsValue> = {}, onChange = vi.fn()) =>
  render(
    <BookingSettings
      state="ready"
      value={{ ...value, ...over }}
      onChange={onChange}
      maxWindowDays={56}
      responseWindowHours={12}
      sessionsUsingRules={2}
    />,
  );

describe('BookingSettings', () => {
  it('approval on: the switch is named by its heading, with the no-response line and the footnote', () => {
    ready();
    const sw = screen.getByRole('switch', { name: 'Approve bookings' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(sw).toHaveAccessibleDescription('You decide which requests to accept.');
    expect(
      screen.getByText(
        /12 hours before the session, the request expires and the mentee will be informed/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mentees see “Needs your approval” before they book.'),
    ).toBeInTheDocument();
  });

  it('approval off: no no-response line and no footnote', () => {
    ready({ requiresApproval: false });
    expect(screen.getByRole('switch')).toHaveAccessibleDescription(
      'Mentees book any available time and it’s confirmed straight away.',
    );
    expect(screen.queryByText(/the request expires/)).toBeNull();
    expect(screen.queryByText(/Needs your approval/)).toBeNull();
  });

  it('the switch sends approval with the rules unchanged', async () => {
    const onChange = vi.fn();
    ready({}, onChange);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith({ ...value, requiresApproval: false });
  });

  it('the four rules, in the design’s words; a change sends that rule only', async () => {
    const onChange = vi.fn();
    ready({}, onChange);
    for (const name of [
      'Session length',
      'Minimum notice',
      'Booking window',
      'Buffer between sessions',
    ])
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Session length' }), '90');
    expect(onChange).toHaveBeenCalledWith({ ...value, durationMin: 90 });
  });

  it('a value set elsewhere (21 days, 36 hours) stays selected, not the first choice', () => {
    ready({ windowDays: 21, noticeHours: 36 });
    expect(screen.getByRole('combobox', { name: 'Booking window' })).toHaveValue('21');
    expect(screen.getByRole('combobox', { name: 'Minimum notice' })).toHaveValue('36');
  });

  it('disabled while saving', () => {
    render(
      <BookingSettings
        state="ready"
        value={value}
        onChange={vi.fn()}
        responseWindowHours={12}
        sessionsUsingRules={0}
        disabled
      />,
    );
    expect(screen.getByRole('switch')).toBeDisabled();
    for (const s of screen.getAllByRole('combobox')) expect(s).toBeDisabled();
  });

  it('error: says so, and Try again retries', async () => {
    const onRetry = vi.fn();
    render(<BookingSettings state="error" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load your booking rules.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('loading: marked busy, no controls yet', () => {
    const { container } = render(<BookingSettings state="loading" />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});

describe('rulesNote', () => {
  const after =
    'Once you save, changes apply to new bookings. Sessions already booked stay as they are.';
  it('counts the sessions that use the rules, singular for one', () => {
    expect(rulesNote(2)).toBe(`2 of your sessions use these rules. ${after}`);
    expect(rulesNote(1)).toBe(`1 of your sessions uses these rules. ${after}`);
  });
  it('leaves the count out at 0 or when it couldn’t load', () => {
    expect(rulesNote(0)).toBe(after);
    expect(rulesNote(null)).toBe(after);
  });
});

describe('noResponseLine', () => {
  it('says the platform’s hours, and no number without them', () => {
    expect(noResponseLine(12)).toBe(
      'If you don’t respond by 12 hours before the session, the request expires and the mentee will be informed.',
    );
    expect(noResponseLine(1)).toBe(
      'If you don’t respond by 1 hour before the session, the request expires and the mentee will be informed.',
    );
    expect(noResponseLine(null)).toBe(
      'If you don’t respond in time, the request expires and the mentee will be informed.',
    );
  });
});
