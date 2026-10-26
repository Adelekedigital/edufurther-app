import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBookingFor } from '@/lib/utils/bookingTestFixtures';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { SlotPicker, chipsFor } from './SlotPicker';

const NOW = new Date('2026-10-03T12:00:00Z');
const OCT_8 = '2026-10-08T14:00:00Z'; // Thu 10:00 am in New York
const OCT_9 = '2026-10-09T18:00:00Z'; // Fri 2:00 pm
const OCT_10 = '2026-10-10T14:00:00Z'; // Sat 10:00 am
const OCT_10_LATE = '2026-10-10T20:00:00Z'; // Sat 4:00 pm
const NOV_3 = '2026-11-03T15:00:00Z'; // Tue 10:00 am

// Stubbed at the data boundary, as the dialog's own tests do: the picker and
// its calendar read this one list and nothing else.
let slots: { data: string[] | null; isLoading: boolean; error: unknown; retry: () => void };
vi.mock('@/lib/api/data/booking', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useSlots: () => slots,
}));

beforeEach(() => {
  slots = {
    data: [OCT_8, OCT_9, OCT_10, OCT_10_LATE, NOV_3],
    isLoading: false,
    error: null,
    retry: vi.fn(),
  };
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

function Harness({
  initial = null,
  onChange = () => {},
}: {
  initial?: string | null;
  onChange?: (v: string | null) => void;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <SlotPicker
      mentorId="m1"
      sessionTypeId="st1"
      accountZone="America/New_York"
      timeZone="America/New_York"
      value={value}
      onChange={(v) => {
        onChange(v);
        setValue(v);
      }}
      otherFirst="Amara"
      label="Suggested time"
      now={NOW}
    />
  );
}

const openDays = () => userEvent.click(screen.getByRole('button', { name: 'Pick another day' }));
const dayDialog = () => screen.getByRole('dialog', { name: 'Pick another day' });
// The pressed chip leads with a check glyph; the name is the label after it.
const chipNames = () =>
  screen.getAllByRole('radio').map((r) => r.textContent?.replace(/^check/, ''));

describe('the chips (SuggestTime.dc.html picker=chips)', () => {
  it('shows the two earliest, then "Pick another day", and never "Show more times"', () => {
    render(<Harness />);
    expect(chipNames()).toEqual(['Thu, Oct 8 · 10:00 am', 'Fri, Oct 9 · 2:00 pm']);
    expect(screen.getByRole('button', { name: 'Pick another day' })).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
    expect(screen.queryByText('Show more times')).not.toBeInTheDocument();
  });

  it('a picked time outside the two shows as the earliest plus the picked one', () => {
    expect(chipsFor([OCT_8, OCT_9, OCT_10], OCT_10)).toEqual([OCT_8, OCT_10]);
    expect(chipsFor([OCT_8, OCT_9, OCT_10], OCT_9)).toEqual([OCT_8, OCT_9]);
    expect(chipsFor([OCT_8, OCT_9, OCT_10], null)).toEqual([OCT_8, OCT_9]);
  });
});

describe('"Pick another day" (SuggestTime.dc.html dayPicker)', () => {
  it('opens a dialog with the design’s title and sub, on the earliest time’s month', async () => {
    render(<Harness />);
    await openDays();
    const d = dayDialog();
    expect(
      within(d).getByText('Times shown in your time zone. Amara sees their own.'),
    ).toBeVisible();
    expect(within(d).getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
    // The earliest day is open, with its times.
    expect(within(d).getByText('Open on Thursday, Oct 8')).toBeVisible();
    expect(within(d).getByRole('radio', { name: '10:00 am' })).toBeVisible();
    // Nothing picked yet, so nothing to use.
    expect(within(d).getByRole('button', { name: 'Use this time' })).toBeDisabled();
  });

  it('marks the days that have open times, from the same slots read', async () => {
    render(<Harness />);
    await openDays();
    const d = dayDialog();
    expect(within(d).getByRole('button', { name: 'Friday, October 9, available' })).toBeVisible();
    expect(within(d).getByRole('button', { name: 'Wednesday, October 7' })).toBeVisible();
  });

  it('picking a day lists its times; Use this time sets the chip and closes', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await openDays();
    const d = dayDialog();
    await userEvent.click(
      within(d).getByRole('button', { name: 'Saturday, October 10, available' }),
    );
    expect(within(d).getByText('Open on Saturday, Oct 10')).toBeVisible();
    expect(
      within(d)
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['10:00 am', '4:00 pm']);
    await userEvent.click(within(d).getByRole('radio', { name: '4:00 pm' }));
    await userEvent.click(within(d).getByRole('button', { name: 'Use this time' }));
    expect(onChange).toHaveBeenCalledWith(OCT_10_LATE);
    expect(screen.queryByRole('dialog', { name: 'Pick another day' })).not.toBeInTheDocument();
    // The earliest, then the picked one, pressed.
    expect(chipNames()).toEqual(['Thu, Oct 8 · 10:00 am', 'Sat, Oct 10 · 4:00 pm']);
    expect(screen.getByRole('radio', { name: 'Sat, Oct 10 · 4:00 pm' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('Go back closes and changes nothing', async () => {
    const onChange = vi.fn();
    render(<Harness initial={OCT_9} onChange={onChange} />);
    await openDays();
    const d = dayDialog();
    await userEvent.click(
      within(d).getByRole('button', { name: 'Saturday, October 10, available' }),
    );
    await userEvent.click(within(d).getByRole('radio', { name: '10:00 am' }));
    await userEvent.click(within(d).getByRole('button', { name: 'Go back' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Pick another day' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Fri, Oct 9 · 2:00 pm' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('past days can’t be picked', async () => {
    render(<Harness />);
    await openDays();
    const d = dayDialog();
    const past = within(d).getByRole('button', { name: 'Friday, October 2' });
    expect(past).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(past);
    expect(within(d).queryByText('Open on Friday, Oct 2')).not.toBeInTheDocument();
    expect(within(d).getByText('Open on Thursday, Oct 8')).toBeVisible();
  });

  it('a day with no open times says so', async () => {
    render(<Harness />);
    await openDays();
    const d = dayDialog();
    await userEvent.click(within(d).getByRole('button', { name: 'Wednesday, October 7' }));
    expect(within(d).getByText('Open on Wednesday, Oct 7')).toBeVisible();
    expect(within(d).getByText('No open times this day.')).toBeVisible();
    expect(within(d).getByRole('button', { name: 'Use this time' })).toBeDisabled();
  });

  it('opens on the picked time’s month and day, with that time chosen', async () => {
    render(<Harness initial={NOV_3} />);
    await openDays();
    const d = dayDialog();
    expect(within(d).getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
    expect(within(d).getByText('Open on Tuesday, Nov 3')).toBeVisible();
    expect(within(d).getByRole('radio', { name: '10:00 am' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(d).getByRole('button', { name: 'Use this time' })).toBeEnabled();
  });
});

describe('in the cancel dialog', () => {
  it('a time from the calendar is the one sent, and the draft names it', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmActionDialog
        action="decline"
        booking={sampleBookingFor({ side: 'mentor', status: 'pending' })}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        now={NOW}
        timeZone="America/New_York"
        viewerId="me"
        accountZone="America/New_York"
      />,
    );
    await openDays();
    const d = dayDialog();
    await userEvent.click(
      within(d).getByRole('button', { name: 'Saturday, October 10, available' }),
    );
    await userEvent.click(within(d).getByRole('radio', { name: '4:00 pm' }));
    await userEvent.click(within(d).getByRole('button', { name: 'Use this time' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline and send' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedStartsAt: OCT_10_LATE,
        reasonText: expect.stringContaining('Could we do Sat, Oct 10 · 4:00 pm instead?'),
      }),
    );
  });
});
