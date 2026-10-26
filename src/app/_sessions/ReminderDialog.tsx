'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Textarea } from '@/components/atoms/Input/Input';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { reminderCopy, REMINDER_MAX } from '@/lib/copy/reminder';
import { dayLabel, formatTime } from '@/lib/utils/format';
import type { Booking } from '@/types/booking';
import styles from './ReminderDialog.module.css';

type ReminderDialogProps = {
  /** The mentee's pending request. */
  booking: Booking;
  /** The viewer's zone: the drafted message names the request's day and start in it. */
  timeZone: string;
  onSend: (message: string) => void;
  onClose: () => void;
  pending?: boolean;
  /** A refusal: the dialog stays open with the text still typed. */
  error?: string | null;
};

/**
 * "Send {First} a reminder?" (`Mentee Bookings.dc.html`, Modal kind="explainer":
 * a bottom sheet on phones). One reminder per request, emailed with it; the
 * message starts drafted and is the mentee's to change.
 *
 * An empty box can't be sent (the API takes 1 to 500 characters), but Send
 * stays pressable and says why, as the confirm dialogs do: a disabled button
 * with nothing saying why is the one people learn to click past.
 */
export function ReminderDialog({
  booking: b,
  timeZone,
  onSend,
  onClose,
  pending,
  error,
}: ReminderDialogProps) {
  const first = b.other.firstName;
  const copy = reminderCopy(first);
  const [message, setMessage] = useState(() =>
    copy.draft(dayLabel(b.startsAt, timeZone), formatTime(b.startsAt, timeZone)),
  );
  const [blank, setBlank] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const empty = !message.trim();

  const close = () => {
    // Not while the request is on its way: vanishing reads as "sent".
    if (!pending) onClose();
  };

  return (
    <ModalShell
      title={copy.title}
      subtitle={copy.subtitle}
      size="md"
      mobile="sheet"
      onClose={close}
      closeDisabled={pending}
    >
      <div className={styles.body}>
        <Textarea
          ref={boxRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (blank) setBlank(false);
          }}
          maxLength={REMINDER_MAX}
          aria-label={copy.label}
          invalid={blank}
          aria-describedby={blank ? `${id}-blank` : undefined}
          className={styles.box}
        />
        {blank && (
          <p id={`${id}-blank`} role="alert" className={styles.error}>
            {copy.blank}
          </p>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <Button
            variant="secondary-outlined"
            size="large"
            fullWidth
            aria-disabled={pending || undefined}
            onClick={close}
          >
            {copy.back}
          </Button>
          <Button
            variant="primary"
            size="large"
            fullWidth
            incomplete={empty}
            busy={pending}
            onClick={() => {
              if (empty) {
                setBlank(true);
                requestAnimationFrame(() => boxRef.current?.focus());
                return;
              }
              onSend(message.trim());
            }}
          >
            {pending ? copy.sending : copy.send}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
