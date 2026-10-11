'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { cx } from '@/lib/utils/cx';
import { Switch } from '@/components/atoms/Switch/Switch';
import { ReasonField } from '@/components/molecules/ReasonField/ReasonField';
import { reasonError } from '@/lib/utils/reasons';
import { SuggestTimeStep } from './SuggestTimeStep';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import type { ActionInput, BookingAction } from '@/lib/api/data/bookingActions';
import { canCancel, refundOnCancel, refundWindowFor } from '@/lib/utils/bookings';
import type { AppError } from '@/types/mentor';
import type { Booking, PickableReason } from '@/types/booking';
import styles from './sessionDialogs.module.css';

type ConfirmActionDialogProps = {
  action: Exclude<BookingAction, 'accept'>;
  booking: Booking;
  onConfirm: (input: Omit<ActionInput, 'bookingId'>) => void;
  onClose: () => void;
  pending?: boolean;
  error?: AppError | null;
  /** The viewer's zone, for the offered times. */
  timeZone: string;
  /** The viewer's own id: a mentor offers their own open times. */
  viewerId: string;
  /** The account zone, for the slots window (never the display override). */
  accountZone: string;
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
  timeZone,
  viewerId,
  accountZone,
  now = new Date(),
}: ConfirmActionDialogProps) {
  const [reasonCode, setReasonCode] = useState<PickableReason | null>(null);
  const [text, setText] = useState('');
  // Mentors only. The default is `true` because the two ways of being wrong are
  // not equally visible: an hour offered while you are busy arrives as a booking
  // you can decline; an hour withheld while you are free arrives as nothing.
  const [stillFree, setStillFree] = useState(true);
  const [suggested, setSuggested] = useState<string | null>(null);
  // Set only by a blocked submit, so the dialog does not scold someone who has
  // not tried to send anything yet.
  const [reasonBad, setReasonBad] = useState<ReturnType<typeof reasonError>>(null);
  const firstChipRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();

  const first = b.other.firstName;
  const isMentor = b.side === 'mentor';
  const refunds = action !== 'cancel' || refundOnCancel(b, now);
  // Re-checked here, not just on the row: this dialog can sit open across the
  // boundary — opened at eleven minutes out, confirmed at nine — and the row's
  // menu item has been behind a modal the whole time.
  const tooLate = action === 'cancel' && !canCancel(b, now);
  const canSuggest = isMentor && action !== 'withdraw';
  // A mentor offering another time has already explained themselves. One value
  // for both the rule and the label, so the dialog cannot require a reason it
  // then accepts without.
  const suggesting = !!(canSuggest && suggested);

  // Mentors never see credit copy — it is not their credit (design's rule).
  const creditLine = isMentor
    ? null
    : action === 'cancel'
      ? refunds
        ? 'Your credit goes back to you.'
        : `This is less than ${refundWindowFor(b)} hours before the session, so the credit is not returned.`
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
          {/* Closed only when nothing is in flight: `reset()` detaches the
              observer but the POST keeps going, so closing mid-flight made the
              dialog vanish — which reads as "done" — while it might fail. */}
          <Button
            variant="secondary-outlined"
            size="large"
            aria-disabled={pending || undefined}
            onClick={pending ? undefined : onClose}
          >
            Keep it
          </Button>
          <Button
            variant="destructive"
            size="large"
            aria-disabled={tooLate || undefined}
            onClick={() => {
              if (tooLate) return;
              // A reason is required (owner, 2026-10-10), except for a mentor
              // offering another time instead — that *is* the explanation.
              const bad = reasonError({
                reasonCode,
                text,
                required: true,
                suggesting,
              });
              setReasonBad(bad);
              if (bad) {
                // Announced by the field, and focus goes to what is wrong:
                // an error that is only read out leaves a keyboard user
                // hunting for the control.
                requestAnimationFrame(() => {
                  const el = bad.field === 'note' ? noteRef.current : firstChipRef.current;
                  el?.focus();
                });
                return;
              }
              onConfirm({
                reasonCode,
                reasonText: text,
                ...(action === 'cancel' && isMentor ? { releaseSlot: stillFree } : {}),
                ...(suggesting ? { suggestedStartsAt: suggested } : {}),
              });
            }}
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
        {creditLine && (
          <p className={cx(styles.confirmCredit, !refunds && styles.confirmCreditLost)}>
            {creditLine}
          </p>
        )}

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

        {/* Mentors only, and only when refusing or calling off — a mentee
            withdrawing has nothing to offer. The contract refuses a mentee's
            `suggested_starts_at` outright. */}
        {canSuggest && (
          <SuggestTimeStep
            booking={b}
            mentorId={viewerId}
            accountZone={accountZone}
            timeZone={timeZone}
            value={suggested}
            onChange={setSuggested}
          />
        )}

        <ReasonField
          side={b.side}
          reasonCode={reasonCode}
          onReasonCode={(v) => {
            setReasonCode(v);
            // The box only exists for "Something else", so anything typed there
            // and then abandoned would travel invisibly: a `reason_text` the
            // person can no longer see on screen, landing in the other party's
            // notification.
            if (v !== 'other') setText('');
            // Clear on change rather than re-validate: a message about the
            // thing they just fixed, still sitting there, reads as broken.
            setReasonBad(null);
          }}
          text={text}
          onText={(v) => {
            setText(v);
            if (reasonBad?.field === 'note') setReasonBad(null);
          }}
          readerFirstName={first}
          required={!suggesting}
          error={reasonBad}
          groupRef={firstChipRef}
          noteRef={noteRef}
        />

        {tooLate && (
          <p role="alert" className={styles.confirmError}>
            This session starts in less than ten minutes, so it can’t be called off now — nobody
            would get the message in time.
          </p>
        )}

        {error && (
          <p role="alert" className={styles.confirmError}>
            {error.message}
          </p>
        )}
      </div>
    </ModalShell>
  );
}
