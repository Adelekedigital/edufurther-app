import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleBookingFor } from '@/lib/utils/bookingTestFixtures';
import { ConfirmActionDialog } from './ConfirmActionDialog';

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();


// The suggest step reads the mentor's real open slots; stubbed at the data
// boundary like every other read in these tests.
let slots: { data: string[] | null; isLoading: boolean; error: unknown; retry: () => void };
let slotsArgs: unknown[] = [];
vi.mock('@/lib/api/data/booking', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useSlots: (...a: unknown[]) => {
    slotsArgs = a;
    return slots;
  },
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
      accountZone="America/New_York"
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
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel session' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ releaseSlot: false }));
  });
});

// The reason became required by the owner's decision, 2026-10-10. These used
// to assert that an empty one went through.
describe('the reason is required, and means it', () => {
  it('a coded reason with no note goes through — only "Something else" needs one', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }), onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: 'technical_issue', reasonText: '' }),
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
    expect(screen.getAllByRole('radio', { name: /Oct \d+, 2026 ·/ })).toHaveLength(2);
    // Eight more at a time: revealing a month of open hours at once pushed the
    // dialog's own buttons about 900px below the fold on a phone.
    expect(screen.getByRole('button', { name: 'Show more times' })).toBeVisible();
  });

  it('the picked time is what gets sent, and only from the picker', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    const [first] = screen.getAllByRole('radio', { name: /Oct \d+, 2026 ·/ });
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
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.not.objectContaining({ suggestedStartsAt: expect.anything() }),
    );
  });

  it('picking the same chip again takes the offer back', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    const [first] = screen.getAllByRole('radio', { name: /Oct \d+, 2026 ·/ });
    await userEvent.click(first!);
    await userEvent.click(first!);
    // Taking the offer back removes the exemption, so a reason is needed again.
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.not.objectContaining({ suggestedStartsAt: expect.anything() }),
    );
  });

  it('the hold is explained only once a time is actually offered', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    expect(screen.queryByText(/then it opens to others again/)).not.toBeInTheDocument();
    const [first] = screen.getAllByRole('radio', { name: /Oct \d+, 2026 ·/ });
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
    // No time to offer means no exemption, so the reason is still required.
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('a failed slots read never blocks the decline either', async () => {
    slots = { data: null, isLoading: false, error: { kind: 'server', message: 'x' }, retry: vi.fn() };
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    expect(screen.getByText(/couldn’t load your open times/)).toBeVisible();
    // A failed slots read gives nothing to offer, so the reason is required.
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
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

describe('whose calendar the picker reads', () => {
  it('asks for the viewer’s own slots, in the account zone', () => {
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    // The single most dangerous bug this component could have: on this dialog
    // the viewer IS the mentor, so `booking.other` is the mentee. Asking for
    // their slots would show a mentor somebody else's availability.
    expect(slotsArgs).toEqual(['me', 'st1', 'America/New_York']);
  });
});

describe('the picker does not bury the dialog', () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 9, 8, 14 + i)).toISOString());

  it('reveals more a handful at a time, not a month at once', async () => {
    slots = { data: many(48), isLoading: false, error: null, retry: vi.fn() };
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Show more times' }));
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    await userEvent.click(screen.getByRole('button', { name: 'Show more times' }));
    expect(screen.getAllByRole('radio')).toHaveLength(18);
  });

  it('stops offering more once everything is shown', async () => {
    slots = { data: many(3), isLoading: false, error: null, retry: vi.fn() };
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    await userEvent.click(screen.getByRole('button', { name: 'Show more times' }));
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Show more times' })).not.toBeInTheDocument();
  });

  it('a slot we cannot read is dropped, not thrown', () => {
    // An unparseable instant threw out of the date formatter and took the whole
    // Bookings screen with it.
    slots = { data: ['not-a-date', ...many(1)], isLoading: false, error: null, retry: vi.fn() };
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(screen.getAllByRole('radio')).toHaveLength(1);
  });

  it('a failure offers a way to try again, and claims nothing about the calendar', async () => {
    const retry = vi.fn();
    slots = { data: null, isLoading: false, error: { kind: 'server', message: 'x' }, retry };
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(screen.getByText(/couldn’t load your open times just now/)).toBeVisible();
    // It cannot see the times, so it cannot know whether there are any.
    expect(screen.queryByText(/nothing to offer/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('only an actual empty list concludes there is nothing to offer', () => {
    slots = { data: [], isLoading: false, error: null, retry: vi.fn() };
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(screen.getByText(/You have no open times for this session/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});

describe('the refund deadline is the server’s, not a number we remember', () => {
  it('names the real window when it is not twelve hours', () => {
    // A 10-hour window, cancelled 9 hours out: too late, and the sentence
    // must say 10 rather than the old hard-coded 12.
    dialog({
      booking: sampleBookingFor({
        side: 'mentee',
        status: 'confirmed',
        startsAt: at(9),
        endsAt: at(10),
        refundUntil: at(-1),
      }),
    });
    expect(screen.getByText(/less than 10 hours before the session/)).toBeVisible();
    expect(screen.queryByText(/12 hours/)).not.toBeInTheDocument();
  });

  it('still refunds right up to the deadline', () => {
    dialog({
      booking: sampleBookingFor({
        side: 'mentee',
        status: 'confirmed',
        startsAt: at(48),
        endsAt: at(49),
        refundUntil: at(1),
      }),
    });
    expect(screen.getByText('Your credit goes back to you.')).toBeVisible();
  });
});

// Required reason, owner's decision 2026-10-10.
describe('a submit with no reason is blocked, not merely scolded', () => {
  const mentee = () =>
    sampleBookingFor({ side: 'mentee', status: 'confirmed', startsAt: at(48), endsAt: at(49) });

  it('sends nothing at all when no reason is picked', async () => {
    // The real risk: a guard that shows an error and fires anyway, so the
    // session is cancelled *and* the person is told off.
    const onConfirm = vi.fn();
    dialog({ booking: mentee(), onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel session' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Pick a reason before you go on.')).toBeVisible();
  });

  it('puts focus on the chips, not just an announcement', async () => {
    dialog({ booking: mentee() });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel session' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'A clash in my calendar' })).toHaveFocus(),
    );
  });

  it('"Something else" with an empty box sends nothing either', async () => {
    const onConfirm = vi.fn();
    dialog({ booking: mentee(), onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel session' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Say briefly what happened.')).toBeVisible();
  });

  it('and focus lands in the box that needs filling', async () => {
    dialog({ booking: mentee() });
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel session' }));
    await waitFor(() => expect(screen.getByLabelText('What happened?')).toHaveFocus());
  });

  it('"Something else" with text goes through, carrying both', async () => {
    const onConfirm = vi.fn();
    dialog({ booking: mentee(), onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.type(screen.getByLabelText('What happened?'), 'visa refused');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel session' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: 'other', reasonText: 'visa refused' }),
    );
  });

  it('the error clears as soon as they fix it', async () => {
    dialog({ booking: mentee() });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel session' }));
    expect(screen.getByText('Pick a reason before you go on.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    // A message about the thing they just fixed reads as broken.
    expect(screen.queryByText('Pick a reason before you go on.')).not.toBeInTheDocument();
  });

  it('a withdrawal needs one too, from the mentee list', async () => {
    // Same list as cancelling: the action does not change it, the side does.
    const onConfirm = vi.fn();
    dialog({ action: 'withdraw', booking: sampleBookingFor({ side: 'mentee', status: 'pending' }), onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw request' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'I’m no longer free' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'I no longer need it' }));
    await userEvent.click(screen.getByRole('button', { name: 'Withdraw request' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: 'mentee_no_longer_needed' }),
    );
  });
});
