import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBookingFor } from '@/lib/utils/bookingTestFixtures';
import { ConfirmActionDialog } from './ConfirmActionDialog';

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

beforeEach(() => {
  // ModalShell checks the viewport for its sheet treatment.
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

const dialog = (props: Partial<Parameters<typeof ConfirmActionDialog>[0]> = {}) =>
  render(
    <ConfirmActionDialog
      action="cancel"
      booking={sampleBookingFor({ status: 'confirmed', startsAt: at(48), endsAt: at(49) })}
      onConfirm={vi.fn()}
      onClose={vi.fn()}
      now={NOW}
      {...props}
    />,
  );

describe('what happens to the credit is said before the button', () => {
  it('a mentee cancelling with notice is told the credit comes back', () => {
    dialog({
      booking: sampleBookingFor({ side: 'mentee', status: 'confirmed', startsAt: at(48), endsAt: at(49) }),
    });
    expect(screen.getByText('Your credit goes back to you.')).toBeVisible();
  });

  it('a mentee cancelling inside twelve hours is told before they confirm, not after', () => {
    dialog({
      booking: sampleBookingFor({ side: 'mentee', status: 'confirmed', startsAt: at(9), endsAt: at(10) }),
    });
    const warning = screen.getByText(/less than 12 hours before the session/);
    expect(warning).toBeVisible();
    // Before: finding this out afterwards is the complaint this prevents.
    expect(
      warning.compareDocumentPosition(screen.getByRole('button', { name: 'Cancel session' })),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('a mentor never sees credit wording — it is not their credit', () => {
    dialog({
      booking: sampleBookingFor({ side: 'mentor', status: 'confirmed', startsAt: at(9), endsAt: at(10) }),
    });
    expect(screen.queryByText(/credit/i)).not.toBeInTheDocument();
  });

  it('a withdrawal returns the credit whenever it happens', () => {
    dialog({ action: 'withdraw', booking: sampleBookingFor({ side: 'mentee', status: 'pending' }) });
    expect(screen.getByText('Your credit goes back to you.')).toBeVisible();
  });
});

describe('the mentor’s slot choice', () => {
  it('defaults to still free, so an hour is not quietly withheld', () => {
    dialog({ booking: sampleBookingFor({ side: 'mentor', status: 'confirmed', startsAt: at(48), endsAt: at(49) }) });
    expect(screen.getByRole('switch', { name: 'I’m still free at this time' })).toBeChecked();
  });

  it('is a mentor-only field', () => {
    dialog({ booking: sampleBookingFor({ side: 'mentee', status: 'confirmed', startsAt: at(48), endsAt: at(49) }) });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('is not offered on a decline, which frees nothing', () => {
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('turning it off is what gets sent', async () => {
    const onConfirm = vi.fn();
    dialog({
      booking: sampleBookingFor({ side: 'mentor', status: 'confirmed', startsAt: at(48), endsAt: at(49) }),
      onConfirm,
    });
    await userEvent.click(screen.getByRole('switch'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel session' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ releaseSlot: false }));
  });
});

describe('the reason is optional, and means it', () => {
  it('confirms with nothing filled in', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }), onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: null, reasonText: '' }),
    );
  });

  it('says who will read the note', () => {
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(screen.getByText(/Amara will read/)).toBeVisible();
  });

  it('a mentor is not offered "I no longer need it"', () => {
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(screen.queryByRole('button', { name: 'I no longer need it' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'I’m no longer free' })).toBeVisible();
  });

  it('a mentee is not offered "I’m no longer free"', () => {
    dialog({ action: 'withdraw', booking: sampleBookingFor({ side: 'mentee', status: 'pending' }) });
    expect(screen.queryByRole('button', { name: 'I’m no longer free' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'I no longer need it' })).toBeVisible();
  });
});

describe('the unhappy paths', () => {
  it('a refusal is shown in our words, and the dialog stays open to retry', () => {
    dialog({ error: { kind: 'conflict', message: 'This booking changed while you were looking.' } });
    expect(screen.getByRole('alert')).toHaveTextContent('This booking changed while you were looking.');
    expect(screen.getByRole('button', { name: 'Cancel session' })).toBeVisible();
  });

  it('while working, the button says so and is not clickable twice', () => {
    dialog({ pending: true });
    const confirm = screen.getByRole('button', { name: 'Working…' });
    expect(confirm).toHaveAttribute('aria-busy', 'true');
  });

  it('a second click while working does nothing', async () => {
    const onConfirm = vi.fn();
    dialog({ pending: true, onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Working…' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('"Keep it" closes without doing anything', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    dialog({ onClose, onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
