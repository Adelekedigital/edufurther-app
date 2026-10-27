import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { SessionType } from '@/types/mentor';
import { ConfirmActionDialog, type MoveOption } from './ConfirmActionDialog';

// The mentee's move (PRD Session Join fixes, fix 1). The cancel view as built
// is ConfirmActionDialog.test.tsx's; this file is the move view and the rules
// for when it shows.

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

let slotsArgs: unknown[] = [];
vi.mock('@/lib/api/data/booking', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useSlots: (...a: unknown[]) => {
    slotsArgs = a;
    return {
      data: ['2026-10-08T14:00:00Z', '2026-10-09T18:00:00Z', '2026-10-10T14:00:00Z'],
      isLoading: false,
      error: null,
      retry: vi.fn(),
    };
  },
}));

beforeEach(() => {
  slotsArgs = [];
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

const TYPE: SessionType = {
  id: 'st1',
  name: '1:1 call',
  durationMin: 30,
  description: '',
  windowDays: 30,
  requiresConfirmation: false,
  questions: [],
};

// 48 hours out, refundable until 12 hours before.
const menteeBooking = (over: Parameters<typeof sampleBookingFor>[0] = {}) =>
  sampleBookingFor({
    side: 'mentee',
    status: 'confirmed',
    sessionTypeId: 'st1',
    startsAt: at(48),
    endsAt: at(49),
    refundUntil: at(36),
    other: sampleParty({ id: 'mentor-1', name: 'Amara Okafor', firstName: 'Amara' }),
    ...over,
  });

const moveOption = (over: Partial<MoveOption> = {}): MoveOption => ({
  sessionType: TYPE,
  onMove: vi.fn(),
  pending: false,
  error: null,
  ...over,
});

const dialog = (
  props: Partial<Parameters<typeof ConfirmActionDialog>[0]> = {},
  move: MoveOption | null = moveOption(),
) =>
  render(
    <ConfirmActionDialog
      action="cancel"
      booking={menteeBooking()}
      onConfirm={vi.fn()}
      onClose={vi.fn()}
      now={NOW}
      timeZone="America/New_York"
      viewerId="me"
      accountZone="America/New_York"
      move={move ?? undefined}
      {...props}
    />,
  );

const moveSwitch = () => screen.getByRole('switch', { name: 'Book a new time with Amara' });

describe('when the move view opens', () => {
  it('a mentee 12+ hours out sees "Move this session?" with the mentor’s open times', () => {
    dialog();
    expect(screen.getByRole('heading', { name: 'Move this session?' })).toBeVisible();
    expect(screen.getByText(/Your session with/)).toHaveTextContent(
      'Your session with Amara Okafor is on Mon, Oct 5 at 8:00 am. Pick a new time, or switch this off to cancel.',
    );
    expect(moveSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByText('From Amara’s open times. It moves right away, same credit.'),
    ).toBeVisible();
    // The mentor's times for this session type, in the account zone.
    expect(slotsArgs).toEqual(['mentor-1', 'st1', 'America/New_York']);
    expect(screen.getByText('New time')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Pick another day' })).toBeVisible();
    // No hold line and no credit notice in the move view.
    expect(screen.queryByText(/Held for/)).not.toBeInTheDocument();
    expect(screen.queryByText(/credit comes back/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep session' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Move session' })).toBeVisible();
  });

  it('past the refund deadline (under 12 hours) it is the cancel as built', () => {
    dialog({ booking: menteeBooking({ startsAt: at(10), endsAt: at(11), refundUntil: at(-2) }) });
    expect(screen.getByRole('heading', { name: 'Cancel this booking?' })).toBeVisible();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText(/credit is not returned/)).toBeVisible();
  });

  it('without a known session type it is the cancel as built', () => {
    dialog({}, null);
    expect(screen.getByRole('heading', { name: 'Cancel this booking?' })).toBeVisible();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('the mentor’s dialog is unchanged, move or not', () => {
    dialog({ booking: menteeBooking({ side: 'mentor' }) });
    expect(screen.getByRole('heading', { name: 'Cancel this booking?' })).toBeVisible();
    expect(screen.getByRole('switch', { name: 'Suggest a new time to Amara' })).toBeVisible();
    expect(screen.queryByText('Move this session?')).not.toBeInTheDocument();
  });
});

describe('with approval on the session type', () => {
  const request = () => moveOption({ sessionType: { ...TYPE, requiresConfirmation: true } });

  it('says it goes as a request, and the button reads Send request', () => {
    dialog({}, request());
    expect(screen.getByText('From Amara’s open times. Sent as a request.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send request' })).toBeVisible();
  });

  it('drafts the request message', async () => {
    dialog({}, request());
    await userEvent.click(screen.getByRole('radio', { name: 'Thu, Oct 8 · 10:00 am' }));
    expect(screen.getByRole('textbox', { name: 'Message to Amara' })).toHaveValue(
      'Hi Amara, I can’t make our session on Mon, Oct 5. Could we do Thu, Oct 8 · 10:00 am instead? I’ve sent it as a request.',
    );
  });
});

describe('picking a time and the message', () => {
  it('no message box until a time is picked; then the drafted message, max 500', async () => {
    dialog();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Thu, Oct 8 · 10:00 am' }));
    const box = screen.getByRole('textbox', { name: 'Message to Amara' });
    expect(box).toHaveValue(
      'Hi Amara, I can’t make our session on Mon, Oct 5. I’ve moved it to Thu, Oct 8 · 10:00 am. See you then.',
    );
    expect(box).toHaveAttribute('maxLength', '500');
  });

  it('a change of time swaps it inside an edited message, keeping the edit', async () => {
    dialog();
    await userEvent.click(screen.getByRole('radio', { name: 'Thu, Oct 8 · 10:00 am' }));
    const box = screen.getByRole('textbox', { name: 'Message to Amara' });
    await userEvent.type(box, ' Thanks!');
    await userEvent.click(screen.getByRole('radio', { name: 'Fri, Oct 9 · 2:00 pm' }));
    expect(box).toHaveValue(
      'Hi Amara, I can’t make our session on Mon, Oct 5. I’ve moved it to Fri, Oct 9 · 2:00 pm. See you then. Thanks!',
    );
  });

  it('Move session sends the picked time and the message', async () => {
    const move = moveOption();
    dialog({}, move);
    await userEvent.click(screen.getByRole('radio', { name: 'Fri, Oct 9 · 2:00 pm' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move session' }));
    expect(move.onMove).toHaveBeenCalledWith({
      startsAt: '2026-10-09T18:00:00Z',
      message:
        'Hi Amara, I can’t make our session on Mon, Oct 5. I’ve moved it to Fri, Oct 9 · 2:00 pm. See you then.',
    });
  });
});

describe('Move session with no time', () => {
  it('looks dimmed, stays pressable, says what is missing and focuses the switch', async () => {
    const move = moveOption();
    dialog({}, move);
    const button = screen.getByRole('button', { name: 'Move session' });
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute('aria-disabled');
    await userEvent.click(button);
    expect(move.onMove).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Pick a time, or switch this off to cancel instead.',
    );
    await waitFor(() => expect(moveSwitch()).toHaveFocus());
  });
});

describe('switched off', () => {
  it('is the cancel view as built, and the cancel goes through onConfirm', async () => {
    const onConfirm = vi.fn();
    const move = moveOption();
    dialog({ onConfirm }, move);
    await userEvent.click(moveSwitch());
    expect(screen.getByRole('heading', { name: 'Cancel this booking?' })).toBeVisible();
    expect(screen.getByText(/your credit comes back/)).toBeVisible();
    expect(screen.queryByText('New time')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'I no longer need it' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel session' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: 'mentee_no_longer_needed' }),
    );
    expect(move.onMove).not.toHaveBeenCalled();
  });

  it('switching back on starts again with no time picked', async () => {
    dialog();
    await userEvent.click(screen.getByRole('radio', { name: 'Thu, Oct 8 · 10:00 am' }));
    await userEvent.click(moveSwitch());
    await userEvent.click(moveSwitch());
    expect(screen.getByRole('heading', { name: 'Move this session?' })).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

describe('while moving, and when it stops', () => {
  it('the button says Working… and Keep session doesn’t close it', async () => {
    const onClose = vi.fn();
    dialog({ onClose }, moveOption({ pending: true }));
    const footer = screen.getByRole('button', { name: 'Keep session' }).parentElement!;
    expect(within(footer).getByRole('button', { name: 'Working…' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Keep session' }));
    expect(onClose).not.toHaveBeenCalled();
    // The switch is locked too: no cancel view while the move is running.
    expect(moveSwitch()).toBeDisabled();
  });

  it('an error before the cancel shows in the dialog', () => {
    dialog({}, moveOption({ error: 'We couldn’t get your session ready to move.' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We couldn’t get your session ready to move.',
    );
  });
});
