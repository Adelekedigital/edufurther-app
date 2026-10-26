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

/**
 * A mentor's dialog opens with "Suggest a new time" on, which is the design's
 * default and hides the reason chips — offering a time and giving a reason are
 * alternatives. Tests that are about the reason turn the offer off first.
 */
const offerOff = async (first = 'Amara') =>
  userEvent.click(screen.getByRole('switch', { name: `Suggest a new time to ${first}` }));

/**
 * The message `SuggestTime.dc.html` drafts for the first open slot, written out
 * rather than built from the same helper the component uses — a draft composed
 * by the code under test would pass whatever it said.
 */
const DRAFT_DECLINE =
  'Hi Amara, I can’t make the time you asked for. Could we do Thu, Oct 8 · 10:00 am instead? ' +
  'I’ve held it for you for 2 hours. If it doesn’t suit you, pick any other open time on my profile.';

describe('the dialog says which session it is about', () => {
  it('asks the question, and names the person, the day and the start time', () => {
    dialog();
    expect(screen.getByRole('heading', { name: 'Cancel this booking?' })).toBeVisible();
    // The design's own sentence, read from `startsAt` in the viewer's zone.
    // Naming the wrong hour here is how someone calls off the wrong session.
    expect(screen.getByText(/Are you sure you want to cancel this session/)).toHaveTextContent(
      'with Amara Okafor on Mon, Oct 5 at 8:00 am?',
    );
  });
});

describe('what happens to the credit is said before the button', () => {
  it('a mentee cancelling with notice is told until when the credit comes back', () => {
    // No `refundUntil` on the row: the deadline is the start less the
    // fallback twelve hours, read in the viewer's zone (EDT).
    dialog({
      booking: sampleBookingFor({ side: 'mentee', status: 'confirmed', startsAt: at(48), endsAt: at(49) }),
    });
    expect(
      screen.getByText(
        'Cancel before Sun, Oct 4, 8:00 pm and your credit comes back. After that, the credit is used.',
      ),
    ).toBeVisible();
  });

  it('a mentee cancelling inside twelve hours is told before they confirm, not after', () => {
    dialog({
      booking: sampleBookingFor({ side: 'mentee', status: 'confirmed', startsAt: at(9), endsAt: at(10) }),
    });
    const warning = screen.getByText(/less than 12 hours before the session/);
    expect(warning).toBeVisible();
    // Before: finding this out afterwards is the complaint this prevents.
    expect(
      warning.compareDocumentPosition(
        screen.getByRole('button', { name: 'Yes, cancel session' }),
      ),
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
    expect(screen.getByText('Your credit comes back.')).toBeVisible();
  });
});

describe('what happens to the hour, said as a line', () => {
  const mentorCancel = () =>
    sampleBookingFor({ side: 'mentor', status: 'confirmed', startsAt: at(48), endsAt: at(49) });

  it('the hour stays blocked unless the mentor reopens it', () => {
    // The default flipped on 2026-10-13 (`freeStyle="line"`). It used to free
    // the hour unless told otherwise.
    dialog({ booking: mentorCancel() });
    expect(screen.getByText(/slot stays blocked on your calendar/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reopen it' })).toBeVisible();
  });

  it('names the one slot, with its date, never a bare hour', () => {
    // "6:00 pm" alone reads as every 6 pm rather than this one.
    dialog({ booking: mentorCancel() });
    expect(screen.getByText(/^\w{3}, Oct \d+, \d+:\d\d [ap]m slot stays blocked/)).toBeVisible();
  });

  it('the link flips the line, and says how to undo itself', async () => {
    dialog({ booking: mentorCancel() });
    await userEvent.click(screen.getByRole('button', { name: 'Reopen it' }));
    expect(screen.getByText(/slot stays open on your calendar/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Keep it blocked' })).toBeVisible();
  });

  it('is a mentor-only line', () => {
    dialog({ booking: sampleBookingFor({ side: 'mentee', status: 'confirmed', startsAt: at(48), endsAt: at(49) }) });
    expect(screen.queryByText(/on your calendar/)).not.toBeInTheDocument();
  });

  it('is not offered on a decline, which frees nothing', () => {
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(screen.queryByText(/on your calendar/)).not.toBeInTheDocument();
  });

  it('sends releaseSlot false by default — the hour is not quietly given away', async () => {
    const onConfirm = vi.fn();
    dialog({ booking: mentorCancel(), onConfirm });
    // The chips sit behind the offer, which a mentor's dialog opens with on.
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel session' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ releaseSlot: false }));
  });

  it('and true once reopened', async () => {
    const onConfirm = vi.fn();
    dialog({ booking: mentorCancel(), onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Reopen it' }));
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel session' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ releaseSlot: true }));
  });
});

// The reason became required by the owner's decision, 2026-10-10. These used
// to assert that an empty one went through.
describe('the reason is required, and means it', () => {
  it('a coded reason with no note goes through — only "Something else" needs one', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }), onConfirm });
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: 'technical_issue', reasonText: '' }),
    );
  });

  it('says what the other person will be told, and changes it for Other', async () => {
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    await offerOff();
    // A picked chip reaches Amara as our sentence, not as the chip's own
    // first-person label, so the hint promises being told rather than read.
    expect(screen.getByText('Amara sees the reason you pick.')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    expect(screen.getByText('Amara reads what you write.')).toBeVisible();
  });

  it('a mentor is not offered "I no longer need it"', async () => {
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    await offerOff();
    expect(screen.queryByRole('button', { name: 'I no longer need it' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'I’m no longer free' })).toBeVisible();
  });

  it('a mentee is not offered "I’m no longer free"', () => {
    dialog({ action: 'withdraw', booking: sampleBookingFor({ side: 'mentee', status: 'pending' }) });
    expect(screen.queryByRole('button', { name: 'I’m no longer free' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'I no longer need it' })).toBeVisible();
  });

  it('a mentor offering a time is not asked for a reason as well', async () => {
    // One question at a time. The old version of this test read an "Optional"
    // tag on the reason label; there is no label to read now, because offering
    // a time replaces the field rather than relaxing it — a required field
    // that quietly accepts nothing is what trains someone to ignore the
    // marking, and the way out is to not ask twice.
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(screen.queryByRole('group', { name: 'Reason for declining' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Something technical' })).not.toBeInTheDocument();
    await offerOff();
    // And the question comes back the moment the offer is off, rather than
    // leaving a dialog with nothing to say.
    expect(screen.getByRole('group', { name: 'Reason for declining' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Something technical' })).toBeVisible();
  });
});

describe('the box belongs to Other, and what was typed there does not outlive it', () => {
  const mentorPending = () => sampleBookingFor({ side: 'mentor', status: 'pending' });

  it('no box until Other is picked', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    await offerOff();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    expect(screen.getByRole('textbox')).toBeVisible();
  });

  it('switching away from Other sends nothing of what was typed', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.type(screen.getByRole('textbox'), 'changed my mind about this');
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    // The box is gone from the screen, so its contents must be gone from the
    // payload too: an invisible reason_text lands in the other party's
    // notification with nobody having chosen to send it.
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: 'technical_issue', reasonText: '' }),
    );
  });

  it('typed words survive every tap of the chip — a deselect is not a delete', async () => {
    // Tapping chips is how someone explores the options. Losing what they
    // wrote to an exploratory tap, with no undo, is the worse failure, so the
    // text lives in state and no tap clears it (owner, 2026-10-12).
    dialog({ action: 'decline', booking: mentorPending() });
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.type(screen.getByRole('textbox'), 'a long explanation I do not want to lose');
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    expect(screen.getByRole('textbox')).toHaveValue('a long explanation I do not want to lose');
  });

  it('unpicking leaves no reason, so the confirm is blocked even with words typed', async () => {
    // The path the keep-the-text rule opens up: words held in state, no code.
    // Text alone is not a reason — the server wants the code (backend #417) —
    // and sending the note under no code would reach them as a quote with
    // nothing explaining it.
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.type(screen.getByRole('textbox'), 'I typed this and then unpicked');
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(screen.getByText('Pick a reason before you go on.')).toBeVisible();
    // The dialog moves focus in a requestAnimationFrame, so the chip has it a
    // frame later rather than on the click.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'A clash in my calendar' })).toHaveFocus(),
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('words typed, then hidden by the offer going back on, are not sent either', async () => {
    // The one ordering that hides the box by unmounting the whole field rather
    // than by changing the chip. Both are caught by the same guard, and this is
    // the sequence that would notice if someone ever split it in two.
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.type(screen.getByRole('textbox'), 'written while the offer was off');
    // Back on: the reason field goes entirely, text and all.
    await userEvent.click(screen.getByRole('switch', { name: 'Suggest a new time to Amara' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    const [slot] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slot!);
    await userEvent.click(screen.getByRole('button', { name: 'Decline and send' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        reasonCode: 'mentor_unavailable',
        // The offer's own drafted message — and not one word of what was typed
        // into the reason box while the offer was off.
        reasonText: DRAFT_DECLINE,
      }),
    );
  });

  it('switching to another chip and back shows the same words again', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.type(screen.getByRole('textbox'), 'first thoughts');
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    expect(screen.getByRole('textbox')).toHaveValue('first thoughts');
  });

  it('but a reason that is not Other sends no words at all', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.type(screen.getByRole('textbox'), 'changed my mind about this');
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    // Held in state so it can come back, but never sent: the box is off screen,
    // so these are words the person cannot see, and they must not land in the
    // other party's notification.
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: 'technical_issue', reasonText: '' }),
    );
  });
});

describe('what offering a time promises depends on what was approved', () => {
  it('a decline says the mentee skips the approval wait', () => {
    // True since backend #435: a declined request was never approved, so the
    // offered time is pre-approved and the booking confirms at once.
    dialog({ action: 'decline', booking: sampleBookingFor({ side: 'mentor', status: 'pending' }) });
    expect(
      screen.getByText('They book it in one tap, with no wait for your approval'),
    ).toBeVisible();
  });

  it('a cancel promises nothing of the sort, because there is nothing to skip', () => {
    dialog({ booking: sampleBookingFor({ side: 'mentor', status: 'confirmed' }) });
    expect(screen.getByText('They get one tap to book it')).toBeVisible();
  });
});

describe('turning the offer off takes the offered time with it', () => {
  const mentorPending = () => sampleBookingFor({ side: 'mentor', status: 'pending' });

  it('a time picked, then hidden by switching the offer off, is not sent', async () => {
    // It used to survive. The picker remounts showing only its first two
    // chips with none pressed, so a mentor could send a fifth-slot instant
    // that was nowhere on screen.
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    const [slot] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slot!);
    await userEvent.click(screen.getByRole('switch', { name: 'Suggest a new time to Amara' }));
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.not.objectContaining({ suggestedStartsAt: expect.anything() }),
    );
  });

  it('a blocked submit does not leave an error waiting to reappear', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    await userEvent.click(screen.getByRole('switch', { name: 'Suggest a new time to Amara' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(screen.getByText('Pick a reason before you go on.')).toBeVisible();
    // Away and back is not another attempt to send.
    await userEvent.click(screen.getByRole('switch', { name: 'Suggest a new time to Amara' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Suggest a new time to Amara' }));
    expect(screen.queryByText('Pick a reason before you go on.')).not.toBeInTheDocument();
  });
});

describe('the offered time only implies the mentor was busy when it is true', () => {
  const mentorCancel = () =>
    sampleBookingFor({ side: 'mentor', status: 'confirmed', startsAt: at(48), endsAt: at(49) });

  it('a mentor cancelling leaves the hour blocked, so the code is true', async () => {
    // The hour stays blocked by default now, so offering another time and
    // saying "not free then" agree with each other.
    const onConfirm = vi.fn();
    dialog({ booking: mentorCancel(), onConfirm });
    const [slot] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slot!);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel and send' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: 'mentor_unavailable', releaseSlot: false }),
    );
  });

  it('but one who reopens the hour sends no reason code at all', async () => {
    // "Reopen it" says the hour is fine. Sending `mentor_unavailable` beside it
    // would reach the mentee as "No longer free at that time" under the
    // opposite claim, so that path leans on the server's exemption instead.
    const onConfirm = vi.fn();
    dialog({ booking: mentorCancel(), onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Reopen it' }));
    const [slot] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slot!);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel and send' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: null, releaseSlot: true }),
    );
  });
});

describe('the unhappy paths', () => {
  it('a refusal is shown in our words, and the dialog stays open to retry', () => {
    dialog({ error: { kind: 'conflict', message: 'This booking changed while you were looking.' } });
    expect(screen.getByRole('alert')).toHaveTextContent('This booking changed while you were looking.');
    // A mentor's dialog opens offering a time, so the confirm reads "and send".
    expect(screen.getByRole('button', { name: 'Cancel and send' })).toBeVisible();
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

  it('"Keep session" closes without doing anything', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    dialog({ onClose, onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Keep session' }));
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
    expect(screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ })).toHaveLength(2);
    // Eight more at a time: revealing a month of open hours at once pushed the
    // dialog's own buttons about 900px below the fold on a phone.
    expect(screen.getByRole('button', { name: 'Show more times' })).toBeVisible();
  });

  it('the picked time is what gets sent, and only from the picker', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    const [first] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(first!);
    await userEvent.click(screen.getByRole('button', { name: 'Decline and send' }));
    // Every option comes from /slots, which is what makes a 422 unreachable.
    // The offer carries its own code: a mentor offering another hour still
    // wants the session, just not that one, and that is a true reason to
    // record (owner, 2026-10-13). And words go with it now: this path used to
    // send `''`, so the mentee got an hour with nothing said about it.
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        reasonCode: 'mentor_unavailable',
        reasonText: DRAFT_DECLINE,
        suggestedStartsAt: '2026-10-08T14:00:00Z',
      }),
    );
  });

  it('offering nothing is still a decline', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    // Turning the offer off is how you decline without one, and that is the
    // path that has to send no time at all.
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.not.objectContaining({ suggestedStartsAt: expect.anything() }),
    );
  });

  it('picking the same chip again takes the offer back', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    const [first] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(first!);
    await userEvent.click(first!);
    // Nothing offered on the offering path means nothing to send: the confirm
    // explains itself rather than declining with an empty offer.
    await userEvent.click(screen.getByRole('button', { name: 'Decline and send' }));
    expect(onConfirm).not.toHaveBeenCalled();
    // And the time that was taken back does not travel with the reason either.
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.not.objectContaining({ suggestedStartsAt: expect.anything() }),
    );
  });

  it('the hold is explained only once a time is actually offered', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    expect(screen.queryByText(/then it opens to others again/)).not.toBeInTheDocument();
    const [first] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(first!);
    expect(screen.getByText(/Held for Amara for 2 hours/)).toBeVisible();
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
    // Nothing to offer, so the way through is the reason — which means turning
    // the offer off first. The decline is still reachable.
    await offerOff();
    await userEvent.click(screen.getByRole('button', { name: 'Something technical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('a failed slots read never blocks the decline either', async () => {
    slots = { data: null, isLoading: false, error: { kind: 'server', message: 'x' }, retry: vi.fn() };
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    expect(screen.getByText(/couldn’t load your open times/)).toBeVisible();
    // A failed slots read gives nothing to offer, so the reason is the way
    // through — behind the offer switch, and still reachable.
    await offerOff();
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
    // The server's deadline, not the start less twelve hours.
    expect(screen.getByText(/^Cancel before Sat, Oct 3, 9:00 am and your credit comes back/)).toBeVisible();
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
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel session' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Pick a reason before you go on.')).toBeVisible();
  });

  it('puts focus on the chips, not just an announcement', async () => {
    dialog({ booking: mentee() });
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel session' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'A clash in my calendar' })).toHaveFocus(),
    );
  });

  it('"Something else" with an empty box sends nothing either', async () => {
    const onConfirm = vi.fn();
    dialog({ booking: mentee(), onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel session' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Say briefly what happened.')).toBeVisible();
  });

  it('and focus lands in the box that needs filling', async () => {
    dialog({ booking: mentee() });
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel session' }));
    await waitFor(() => expect(screen.getByLabelText('What happened?')).toHaveFocus());
  });

  it('"Something else" with text goes through, carrying both', async () => {
    const onConfirm = vi.fn();
    dialog({ booking: mentee(), onConfirm });
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    await userEvent.type(screen.getByLabelText('What happened?'), 'visa refused');
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel session' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonCode: 'other', reasonText: 'visa refused' }),
    );
  });

  it('the error clears as soon as they fix it', async () => {
    dialog({ booking: mentee() });
    await userEvent.click(screen.getByRole('button', { name: 'Yes, cancel session' }));
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

describe('the message that goes with an offered time (SuggestTime.dc.html)', () => {
  const mentorPending = () => sampleBookingFor({ side: 'mentor', status: 'pending' });
  const box = () => screen.getByLabelText('Message to Amara');
  const written = () => (box() as HTMLTextAreaElement).value;

  it('nothing to write in until there is a time to write about', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    expect(screen.queryByLabelText('Message to Amara')).not.toBeInTheDocument();
    const [slot] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slot!);
    expect(box()).toBeVisible();
  });

  it('comes pre-filled, naming the offered time and the hold', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    const [slot] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slot!);
    // The design's draft, word for word — and the one thing an offered hour
    // cannot say by itself is in it: why the agreed one is going away.
    expect(box()).toHaveValue(DRAFT_DECLINE);
    // The cap is the design's 500, not the contract's 2000.
    expect(box()).toHaveAttribute('maxlength', '500');
  });

  it('a cancel apologises for the session it is calling off; a decline has none to name', async () => {
    dialog({ booking: sampleBookingFor({ side: 'mentor', status: 'confirmed' }) });
    const [slot] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slot!);
    // A cancel breaks something already agreed, so it names that day. A decline
    // never agreed to anything — saying sorry for cancelling a session that was
    // only ever asked for would be the wrong sentence.
    expect(box()).toHaveValue(
      'Hi Amara, I’m sorry, I have to cancel our session on Sun, Oct 4. Could we do ' +
        'Thu, Oct 8 · 10:00 am instead? I’ve held it for you for 2 hours. If it doesn’t suit ' +
        'you, pick any other open time on my profile.',
    );
    expect(box()).not.toHaveValue(DRAFT_DECLINE);
  });

  it('what is in the box is what gets sent', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    const [slot] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slot!);
    await userEvent.clear(box());
    await userEvent.type(box(), 'Family thing, sorry. Tuesday works much better for me.');
    await userEvent.click(screen.getByRole('button', { name: 'Decline and send' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        reasonText: 'Family thing, sorry. Tuesday works much better for me.',
        suggestedStartsAt: '2026-10-08T14:00:00Z',
      }),
    );
  });

  it('an edit survives picking a different time, and the time inside it is swapped', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    const slots2 = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slots2[0]!);
    await userEvent.type(box(), ' Hope that’s all right.');
    // Changing their mind about the hour must not cost them the sentence they
    // wrote about it — there is no undo in this dialog.
    await userEvent.click(slots2[1]!);
    expect(written()).toContain(' Hope that’s all right.');
    // And the hour named inside it is the one now on offer, not the old one.
    expect(written()).toContain('Fri, Oct 9 · 2:00 pm');
    expect(written()).not.toContain('Thu, Oct 8 · 10:00 am');
    await userEvent.click(screen.getByRole('button', { name: 'Decline and send' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        reasonText: `${DRAFT_DECLINE} Hope that’s all right.`.replace(
          'Thu, Oct 8 · 10:00 am',
          'Fri, Oct 9 · 2:00 pm',
        ),
        suggestedStartsAt: '2026-10-09T18:00:00Z',
      }),
    );
  });

  it('leaves a time the mentor typed themselves alone', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    const slots2 = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slots2[0]!);
    // Their own sentence happens to name the hour the draft is offering. A
    // global replace rewrote this too, so picking another slot silently changed
    // what they had said about a different call (GitHub review, PR 234).
    await userEvent.type(box(), ' I was also free around Thu, Oct 8 · 10:00 am for a backup call.');
    await userEvent.click(slots2[1]!);
    // Ours follows the new hour…
    expect(written()).toContain('Could we do Fri, Oct 9 · 2:00 pm instead?');
    // …and theirs still says exactly what they wrote.
    expect(written()).toContain('I was also free around Thu, Oct 8 · 10:00 am for a backup call.');
  });

  it('a rewritten sentence of ours is not touched again', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    const slots2 = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slots2[0]!);
    await userEvent.clear(box());
    await userEvent.type(box(), 'Can you do Thu, Oct 8 · 10:00 am? I rewrote this myself.');
    await userEvent.click(slots2[1]!);
    // Once they have taken the wording over, editing their prose is the worse
    // of the two wrongs — the chip above still shows the hour on offer.
    expect(box()).toHaveValue('Can you do Thu, Oct 8 · 10:00 am? I rewrote this myself.');
  });

  it('an untouched draft simply follows the time that is picked', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    const slots2 = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slots2[0]!);
    await userEvent.click(slots2[1]!);
    expect(box()).toHaveValue(DRAFT_DECLINE.replace('Thu, Oct 8 · 10:00 am', 'Fri, Oct 9 · 2:00 pm'));
  });

  it('an emptied box sends nothing, and the offer still goes', async () => {
    const onConfirm = vi.fn();
    dialog({ action: 'decline', booking: mentorPending(), onConfirm });
    const [slot] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slot!);
    await userEvent.clear(box());
    // The draft is a convenience, not a requirement: a mentor who wants to say
    // nothing says nothing, and the offered time still carries the meaning
    // (owner, 2026-10-13). An emptied box must not quietly refill itself.
    expect(box()).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Decline and send' }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reasonText: '', suggestedStartsAt: '2026-10-08T14:00:00Z' }),
    );
  });

  it('taking the offer back and starting again drafts afresh, never about the old hour', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    const slots2 = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slots2[0]!);
    await userEvent.type(box(), ' Thanks!');
    // Un-picking is how a mentor takes the offer back; the message was about
    // that hour, so it goes with it rather than coming back describing a time
    // nobody is being offered.
    await userEvent.click(slots2[0]!);
    expect(screen.queryByLabelText('Message to Amara')).not.toBeInTheDocument();
    await userEvent.click(slots2[1]!);
    expect(box()).toHaveValue(DRAFT_DECLINE.replace('Thu, Oct 8 · 10:00 am', 'Fri, Oct 9 · 2:00 pm'));
  });

  it('a mentor who switches the offer off is never asked for a message', async () => {
    dialog({ action: 'decline', booking: mentorPending() });
    const [slot] = screen.getAllByRole('radio', { name: /^\w{3}, Oct \d+ · \d/ });
    await userEvent.click(slot!);
    await offerOff();
    expect(screen.queryByLabelText('Message to Amara')).not.toBeInTheDocument();
  });
});
