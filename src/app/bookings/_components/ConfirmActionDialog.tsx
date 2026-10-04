'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Switch } from '@/components/atoms/Switch/Switch';
import { ReasonField } from '@/components/molecules/ReasonField/ReasonField';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import type { ActionInput, BookingAction, PickableReason } from '@/lib/api/data/bookingActions';
import { refundOnCancel } from '@/lib/utils/bookings';
import type { AppError } from '@/types/mentor';
import type { Booking } from '@/types/booking';
import styles from './BookingsScreen.module.css';

type ConfirmActionDialogProps = {
  action: Exclude<BookingAction, 'accept'>;
  booking: Booking;
  onConfirm: (input: Omit<ActionInput, 'bookingId'>) => void;
  onClose: () => void;
  pending?: boolean;
  error?: AppError | null;
  /** Injected in tests and stories; the clock otherwise. */
  now?: Date;
};

const TITLES = {
  decline: 'Decline this request',
  withdraw: 'Withdraw this request',
  cancel: 'Cancel this session',
} as const;

const CONFIRMS = {
  decline: 'Decline request',
  withdraw: 'Withdraw request',
  cancel: 'Cancel session',
} as const;

/**
 * The confirm step for a decline, a withdrawal or a cancellation.
 *
 * **The design draws no dialog for any of these**, so this is ours, built on
 * ModalShell and the DS's confirm pattern. Recorded as a gap for design.
 *
 * The one rule it exists to enforce: what happens to the credit is stated
 * *before* the button, never after. A mentee who cancels nine hours out loses
 * the credit, and finding that out afterwards is the complaint this prevents.
 */
export function ConfirmActionDialog({
  action,
  booking: b,
  onConfirm,
  onClose,
  pending,
  error,
  now = new Date(),
}: ConfirmActionDialogProps) {
  const [reasonCode, setReasonCode] = useState<PickableReason | null>(null);
  const [text, setText] = useState('');
  // Mentors only. The default is `true` because the two ways of being wrong are
  // not equally visible: an hour offered while you are busy arrives as a booking
  // you can decline; an hour withheld while you are free arrives as nothing.
  const [stillFree, setStillFree] = useState(true);
  const fieldId = useId();

  const first = b.other.firstName;
  const isMentor = b.side === 'mentor';
  const refunds = action !== 'cancel' || refundOnCancel(b, now);

  // Mentors never see credit copy — it is not their credit (design's rule).
  const creditLine = isMentor
    ? null
    : action === 'cancel'
      ? refunds
        ? 'Your credit goes back to you.'
        : 'This is less than 12 hours before the session, so the credit is not returned.'
      : 'Your credit goes back to you.';

  const whatHappens =
    action === 'decline'
      ? `${first} will be told, and their credit goes back to them.`
      : action === 'withdraw'
        ? `${first} will be told you no longer need this session.`
        : `${first} will be told the session is off.`;

  return (
    <ModalShell
      title={TITLES[action]}
      size="md"
      tone="danger"
      onClose={onClose}
      footer={
        <div className={styles.confirmFooter}>
          <Button variant="secondary-outlined" size="large" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            size="large"
            onClick={() =>
              onConfirm({
                reasonCode,
                reasonText: text,
                ...(action === 'cancel' && isMentor ? { releaseSlot: stillFree } : {}),
              })
            }
            // `busy` rather than the aria attributes: the atom owns both, and
            // it also swallows the second click.
            busy={pending}
          >
            {pending ? 'Working…' : CONFIRMS[action]}
          </Button>
        </div>
      }
    >
      <div className={styles.confirmBody}>
        <p className={styles.confirmLead}>{whatHappens}</p>
        {/* Before the button, never after. */}
        {creditLine && <p className={styles.confirmCredit}>{creditLine}</p>}

        {/* Mentors only — a mentee's cancellation always frees the hour. */}
        {action === 'cancel' && isMentor && (
          <div className={styles.slotChoice}>
            <Switch
              checked={stillFree}
              onChange={setStillFree}
              aria-labelledby={`${fieldId}-slot`}
              aria-describedby={`${fieldId}-slot-hint`}
            />
            <div>
              <span id={`${fieldId}-slot`} className={styles.slotLabel}>
                I’m still free at this time
              </span>
              <p id={`${fieldId}-slot-hint`} className={styles.slotHint}>
                On, the hour goes back on your calendar. Off, we mark you unavailable then —
                an ordinary exception you can remove later.
              </p>
            </div>
          </div>
        )}

        <ReasonField
          side={b.side}
          reasonCode={reasonCode}
          onReasonCode={setReasonCode}
          text={text}
          onText={setText}
          readerFirstName={first}
        />

        {error && (
          <p role="alert" className={styles.confirmError}>
            {error.message}
          </p>
        )}
      </div>
    </ModalShell>
  );
}
