'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { ReminderDialog } from '@/app/_sessions/ReminderDialog';
import { useSendReminder } from '@/lib/api/data/reminders';
import { reminderCopy } from '@/lib/copy/reminder';
import { canWithdraw, waitingPill } from '@/lib/utils/bookings';
import type { Booking } from '@/types/booking';

type Options = {
  timeZone: string;
  now: Date;
  /** The page's current copy of a booking: the dialog follows it. */
  live: (bookingId: string) => Booking | undefined;
  /** The page's live region. */
  say: (text: string) => void;
};

/**
 * Send a reminder on a mentee's pending request (PRD Mentee Bookings): one per
 * request, email only, offered with under 24 hours left for the mentor.
 *
 * What's been sent on this page is kept here, by booking, so the row and the
 * pill say "Reminder sent" from the moment the server has it, whatever another
 * row's dialog does, and until the refetched list carries `reminder_sent_at`.
 */
export function useReminders({ timeZone, now, live, say }: Options) {
  const send = useSendReminder();
  const [open, setOpen] = useState<Booking | null>(null);
  const [sentAt, setSentAt] = useState<ReadonlyMap<string, string>>(() => new Map());

  /** The booking as this page knows it, with a reminder sent here applied. */
  const withReminder = (b: Booking): Booking =>
    b.reminderSentAt || !sentAt.has(b.id) ? b : { ...b, reminderSentAt: sentAt.get(b.id) };

  const markSent = (b: Booking) => {
    setSentAt((m) => new Map(m).set(b.id, new Date().toISOString()));
    setOpen(null);
    say(`Reminder sent to ${b.other.firstName}.`);
  };

  // The request moved on while the dialog was open (accepted, declined,
  // withdrawn elsewhere, lapsed): the dialog goes, and says why.
  const current = open ? live(open.id) : undefined;
  if (open && !send.isPending && current && !canWithdraw(current, now)) {
    setOpen(null);
    say(reminderCopy(open.other.firstName).closed);
  }

  /** The row's button: only while urgent, then "Reminder sent" (disabled). */
  const buttonFor = (raw: Booking) => {
    const b = withReminder(raw);
    if (!canWithdraw(b, now) || !waitingPill(b, now)?.urgent) return null;
    const copy = reminderCopy(b.other.firstName);
    return (
      <Button
        variant="secondary-outlined"
        size="small"
        disabled={!!b.reminderSentAt}
        onClick={() => {
          send.reset();
          setOpen(b);
        }}
      >
        {b.reminderSentAt ? copy.rowSent : copy.row}
      </Button>
    );
  };

  const dialog = open && (
    <ReminderDialog
      booking={open}
      timeZone={timeZone}
      pending={send.isPending}
      error={send.failure ? reminderCopy(open.other.firstName)[send.failure] : null}
      onClose={() => {
        send.reset();
        setOpen(null);
      }}
      onSend={(message) =>
        send.send(
          { bookingId: open.id, message },
          {
            onSuccess: () => markSent(open),
            // Already sent means it went: a retry after a lost response, or
            // another tab. Say so as sent, not as a refusal.
            onError: (f) => {
              if (f === 'alreadySent') markSent(open);
            },
          },
        )
      }
    />
  );

  return { withReminder, buttonFor, dialog };
}
