import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBookingFor } from '@/lib/utils/bookingTestFixtures';
import { ConfirmActionDialog } from './ConfirmActionDialog';

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();


// The suggest step reads the mentor's real open slots; stubbed at the data
// boundary like every other read in these tests.
let slots: { data: string[] | null; isLoading: boolean; error: unknown; retry: () => void };
vi.mock('@/lib/api/data/booking', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useSlots: () => slots,
}));

beforeEach(() => {
  slots = {
    data: ['2026-10-08T14:00:00Z', '2026-10-09T18:00:00Z', '2026-10-10T14:00:00Z'],
    isLoading: false,
    error: null,
    retry: vi.fn(),
  };
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
      timeZone="America/New_York"
      viewerId="me"
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

describe('offering another time (SuggestTime.dc.html)', () => {
  const mentorPending = () => sampleBookingFor({ side: 'mentor', status: 'pending' });

  it('a mentor declining is offered their real open times, two of them', () => {
    dialog({ action: 'decline', booking: mentorPending() });
    expect(screen.getByText('Suggested time')).toBeVisible();
    // Two chips, then "Pick another day" — the design's own count.
    expect(screen.getAllByRole('button', { name: /Oct \d+, 2026 ·/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Pick another day' })).toBeVisible();
  });

  it('the picked time is what gets sent, and only from the picker', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    const [first] = screen.getAllByRole('button', { name: /Oct \d+, 2026 ·/ });
    await userEvent.click(first!);
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    // Every option comes from /slots, which is what makes a 422 unreachable.
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedStartsAt: '2026-10-08T14:00:00Z' }),
    );
  });

  it('offering nothing is still a decline', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.not.objectContaining({ suggestedStartsAt: expect.anything() }),
    );
  });

  it('picking the same chip again takes the offer back', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    const [first] = screen.getAllByRole('button', { name: /Oct \d+, 2026 ·/ });
    await userEvent.click(first!);
    await userEvent.click(first!);
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.not.objectContaining({ suggestedStartsAt: expect.anything() }),
    );
  });

  it('the hold is explained only once a time is actually offered', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    expect(screen.queryByText(/then it opens to others again/)).not.toBeInTheDocument();
    const [first] = screen.getAllByRole('button', { name: /Oct \d+, 2026 ·/ });
    await userEvent.click(first!);
    expect(screen.getByText(/Held for Amara for two hours/)).toBeVisible();
  });

  it('a mentee withdrawing is offered nothing — the contract refuses it', () => {
    dialog({ action: 'withdraw', booking: sampleBookingFor({ side: 'mentee', status: 'pending' }) });
    expect(screen.queryByText('Suggested time')).not.toBeInTheDocument();
  });

  it('a mentee cancelling is offered nothing either', () => {
    dialog({ booking: sampleBookingFor({ side: 'mentee', status: 'confirmed', startsAt: at(48), endsAt: at(49) }) });
    expect(screen.queryByText('Suggested time')).not.toBeInTheDocument();
  });

  it('no open times says so, and does not block the decline', async () => {
    slots = { data: [], isLoading: false, error: null, retry: vi.fn() };
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    expect(screen.getByText(/no open times for this session/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('a failed slots read never blocks the decline either', async () => {
    slots = { data: null, isLoading: false, error: { kind: 'server', message: 'x' }, retry: vi.fn() };
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    expect(screen.getByText(/couldn’t load your open times/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe('what the suggest step says when it cannot ask', () => {
  it('never tells a mentor they have no open times when we simply do not know', () => {
    // `data: null` is "no answer", not "none" — a booking with no offering
    // recorded, or a read that could not be made. Saying "you have none" there
    // tells someone something untrue about their own calendar.
    slots = { data: null, isLoading: false, error: null, retry: vi.fn() };
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(screen.getByText(/can’t show your open times/)).toBeVisible();
    expect(screen.queryByText(/You have no open times/)).not.toBeInTheDocument();
  });

  it('shows a shape while it is still asking, not an answer', () => {
    slots = { data: null, isLoading: true, error: null, retry: vi.fn() };
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(screen.getByText('Suggested time')).toBeVisible();
    expect(screen.queryByText(/no open times/)).not.toBeInTheDocument();
    expect(screen.queryByText(/can’t show/)).not.toBeInTheDocument();
  });
});
