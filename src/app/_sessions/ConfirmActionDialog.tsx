'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { cx } from '@/lib/utils/cx';
import { Switch } from '@/components/atoms/Switch/Switch';
import { ReasonField } from '@/components/molecules/ReasonField/ReasonField';
import { Notice } from '@/components/molecules/Notice/Notice';
import { reasonError } from '@/lib/utils/reasons';
import { SuggestTimeStep } from './SuggestTimeStep';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import type { ActionInput, BookingAction } from '@/lib/api/data/bookingActions';
import { canCancel, refundOnCancel, refundWindowFor } from '@/lib/utils/bookings';
import { dayLabel, formatTime } from '@/lib/utils/format';
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

// Every string below is `CancelModal.dc.html`'s, not ours. `withdraw` is the
// one the design does not draw: it has `mode="cancel"` and `mode="decline"`
// only, and a mentee taking back their own request is neither — calling it a
// decline would put the wrong word in front of them. Agreed with the owner,
// 2026-10-13, and synced into the design file as `mode="decline"` with
// `viewer="mentee"`.
const TITLES = {
  decline: 'Decline this request?',
  withdraw: 'Withdraw this request?',
  cancel: 'Cancel this booking?',
} as const;

const CONFIRMS = {
  decline: 'Decline request',
  withdraw: 'Withdraw request',
  cancel: 'Yes, cancel session',
} as const;

/** The design's label once a time is going with it. */
const CONFIRMS_OFFERING = {
  decline: 'Decline and send',
  cancel: 'Cancel and send',
} as const;

/** The design's phone frame: `CancelModal sheet contained`. */
const PHONE = '(max-width: 767px)';

/**
 * The design writes one placeholder, in the cancel voice. Said under "Decline
 * this request?" it asks a mentor why they are "canceling this call", which is
 * the wrong word for the thing they are doing — the same care `TITLES` takes.
 */
const PLACEHOLDERS = {
  cancel: {
    mentor: 'Let the mentee know why you are canceling this call…',
    mentee: 'Let your mentor know why you are canceling…',
  },
  decline: {
    mentor: 'Let the mentee know why you are declining…',
    mentee: 'Let your mentor know why you are declining…',
  },
  withdraw: {
    mentor: 'Let the mentee know why you are withdrawing…',
    mentee: 'Let your mentor know why you are withdrawing…',
  },
} as const;

const REASON_LABELS = {
  decline: 'Reason for declining',
  withdraw: 'Reason for withdrawing',
  cancel: 'Reason for canceling',
} as const;

/**
 * The confirm step for a decline, a withdrawal or a cancellation.
 *
 * Built to `CancelModal.dc.html` (live design project). An earlier version of
 * this comment said the design drew no dialog for these — it does, and had all
 * along; the file was missing from the local mirror we were reading. Every
 * string, size and state here comes from that markup.
 *
 * The one rule the design does not carry, and we keep: what happens to the
 * credit is stated *before* the button, never after. A mentee who cancels nine
 * hours out loses the credit, and finding that out afterwards is the complaint
 * this prevents.
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
  // On by default, as the design has it: a mentor who is calling an hour off
  // usually has another to give, and making them find a link first buries the
  // better outcome under the worse one.
  const [suggestOn, setSuggestOn] = useState(true);
  // Set only by a blocked submit, so the dialog does not scold someone who has
  // not tried to send anything yet.
  const [reasonBad, setReasonBad] = useState<ReturnType<typeof reasonError>>(null);
  // The offering path's equivalent of `reasonBad`, for the same reason: a
  // blocked submit must say something.
  const [offerBad, setOfferBad] = useState(false);
  const offerRef = useRef<HTMLButtonElement>(null);
  const firstChipRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const isPhone = useMediaQuery(PHONE);

  const first = b.other.firstName;
  const isMentor = b.side === 'mentor';
  const refunds = action !== 'cancel' || refundOnCancel(b, now);
  // Re-checked here, not just on the row: this dialog can sit open across the
  // boundary — opened at eleven minutes out, confirmed at nine — and the row's
  // menu item has been behind a modal the whole time.
  const tooLate = action === 'cancel' && !canCancel(b, now);
  const canSuggest = isMentor && action !== 'withdraw';
  // Offering a time and giving a reason are alternatives, never both (owner,
  // 2026-10-13). The design says the same by hiding the chips while the picker
  // is open, so this one value decides which question is being asked.
  const offering = canSuggest && suggestOn;
  const when = { day: dayLabel(b.startsAt, timeZone), start: formatTime(b.startsAt, timeZone) };
  // Offering a time says "not that hour" — unless the mentor has also said the
  // hour is still free, which only a cancel can say.
  const impliesUnavailable = !(action === 'cancel' && isMentor && stillFree);
  // What the confirm is waiting for, which is also what the server will refuse
  // without: a time, or a reason (backend #417).
  const incomplete = offering
    ? !suggested
    : !!reasonError({ reasonCode, text, required: true });

  // Mentors never see credit copy — it is not their credit (design's rule).
  const creditLine = isMentor
    ? null
    : action === 'cancel'
      ? refunds
        ? 'Your credit goes back to you.'
        : `This is less than ${refundWindowFor(b)} hours before the session, so the credit is not returned.`
      : 'Your credit goes back to you.';

  // The design's own sentences. The bold runs are its `<strong>`s.
  const lead =
    action === 'cancel' ? (
      <>
        Are you sure you want to cancel this session with <strong>{b.other.name}</strong> on{' '}
        <strong>{when.day}</strong> at <strong>{when.start}</strong>? They’ll be notified, and
        this action cannot be undone.
      </>
    ) : action === 'withdraw' ? (
      <>
        You asked <strong>{b.other.name}</strong> for <strong>{when.day}</strong> at{' '}
        <strong>{when.start}</strong>. We’ll let them know you’ve taken it back.
      </>
    ) : (
      <>
        <strong>{b.other.name}</strong> asked for <strong>{when.day}</strong> at{' '}
        <strong>{when.start}</strong>. We’ll let them know so they can pick another time.
      </>
    );

  return (
    <ModalShell
      title={TITLES[action]}
      // `size: panel ? 'lg' : 'md'` in the design: the slot picker needs the
      // wider frame, and 480px squeezed its day chips.
      size={offering ? 'lg' : 'md'}
      tone="danger"
      onClose={onClose}
      // A bottom sheet on phones, as `CancelModal.dc.html` draws it — content
      // height, rounded top, the page still there behind it. Not the
      // full-screen treatment: this dialog is short, and a pinned footer a
      // screen away from the textarea ends up behind the keyboard.
      sheet={
        isPhone
          ? {
              heading: TITLES[action],
              // The way out. One close, not two — hence `showClose: false`.
              leading: { icon: 'close', label: 'Close', onClick: onClose, disabled: pending },
              showClose: false,
            }
          : undefined
      }
      contained={isPhone}
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
            {action === 'cancel' ? 'Keep session' : 'Go back'}
          </Button>
          <Button
            variant="destructive"
            size="large"
            // Soft red while it cannot go through, as the design draws it — but
            // still pressable, because a disabled-looking button with nothing
            // saying why is the confirm people learn to click past. Pressing it
            // explains and moves focus.
            className={cx(incomplete && !tooLate && styles.confirmNotYet)}
            // Points at the credit line, so the confirm is not pressed without
            // hearing what happens to it — which is why that line is above the
            // button in the first place.
            aria-describedby={creditLine ? `${fieldId}-credit` : undefined}
            // `tooLate` only. The incomplete state is soft red and says so when
            // pressed — marking it disabled would tell assistive tech the one
            // control that explains what is missing is unavailable.
            aria-disabled={tooLate || undefined}
            onClick={() => {
              if (tooLate) return;
              if (offering) {
                // Not a silent no-op. A mentor whose calendar has no open hours
                // — or whose /slots read failed — opens on this path with
                // nothing to pick, and a confirm that does nothing at all leaves
                // them stuck in a dialog with no way out but noticing a switch.
                if (!suggested) {
                  setOfferBad(true);
                  requestAnimationFrame(() => offerRef.current?.focus());
                  return;
                }
              } else {
                const bad = reasonError({ reasonCode, text, required: true });
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
              }
              onConfirm({
                // Offering another time *is* a reason, and a true one: this
                // mentor still wants the session, just not at this hour
                // (owner, 2026-10-13). Sending the code rather than leaning on
                // the server's exemption keeps the data point the requirement
                // exists for — otherwise most mentor endings would carry no
                // code at all, and reporting would see only the mentee side.
                //
                // Except where it would be a lie. A mentor cancelling who has
                // left "I'm still free at this time" on has just said the hour
                // is fine and put it back on their calendar; sending
                // `mentor_unavailable` would reach the mentee as "No longer
                // free at that time" directly under it. There the time is not
                // the reason, we do not know what is, and the server's
                // `suggested_starts_at` exemption is exactly for a request
                // that honestly has none.
                reasonCode: offering ? (impliesUnavailable ? 'mentor_unavailable' : null) : reasonCode,
                // Only "Something else" has words to send. The box is hidden
                // for every other reason, so anything still held in state is
                // something the person cannot see — it must not reach the
                // other party's notification.
                reasonText: !offering && reasonCode === 'other' ? text : '',
                ...(action === 'cancel' && isMentor ? { releaseSlot: stillFree } : {}),
                ...(offering && suggested ? { suggestedStartsAt: suggested } : {}),
              });
            }}
            // `busy` rather than the aria attributes: the atom owns both, and
            // it also swallows the second click.
            busy={pending}
          >
            {pending
              ? 'Working…'
              : offering
                ? CONFIRMS_OFFERING[action]
                : CONFIRMS[action]}
          </Button>
        </div>
      }
    >
      <div className={styles.confirmBody}>
        <p className={styles.confirmLead}>{lead}</p>
        {/* Before the button, never after — and in the design's `Notice`
            tone="info" with no icon. The window is the server's, never the
            design's hard-coded twelve hours. */}
        {creditLine && (
          <Notice tone="info" id={`${fieldId}-credit`}>
            {/* The design draws one Notice for both outcomes. "Your credit goes
                back" and "the credit is not returned" are the one distinction
                this dialog exists to make, so the losing case keeps its
                emphasis inside the design's frame rather than reading the same
                as the reassuring one. */}
            <span className={!refunds ? styles.confirmCreditLost : undefined}>{creditLine}</span>
          </Notice>
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
          <div className={styles.slotChoice}>
            <Switch
              ref={offerRef}
              checked={suggestOn}
              onChange={(v) => {
                setSuggestOn(v);
                setOfferBad(false);
                // The reason error goes too: switching away and back is not an
                // attempt to submit, and an error waiting to reappear scolds
                // someone who has not tried anything since.
                setReasonBad(null);
                // And the picked time goes with the offer. Keeping it meant a
                // mentor could pick the fifth slot, switch off to read the
                // chips, switch back — and the picker, remounted, shows only
                // the first two with none pressed while the confirm quietly
                // still carried the fifth. A time nowhere on screen must never
                // be the one that gets sent.
                if (!v) setSuggested(null);
              }}
              aria-labelledby={`${fieldId}-sg`}
              aria-describedby={
                offerBad ? `${fieldId}-sg-hint ${fieldId}-sg-err` : `${fieldId}-sg-hint`
              }
            />
            <div>
              <span id={`${fieldId}-sg`} className={styles.slotLabel}>
                Suggest a new time to {first}
              </span>
              {/* Only a decline can promise this, and only since backend #435
                  (2026-10-13). A declined request was never approved, so the
                  offered time skips the wait the mentee would otherwise sit
                  through a second time. A cancel had its approval already —
                  there is nothing to skip, so it promises nothing. */}
              <p id={`${fieldId}-sg-hint`} className={styles.slotHint}>
                {action === 'decline'
                  ? 'They book it in one tap, with no wait for your approval'
                  : 'They get one tap to book it'}
              </p>
              {offerBad && (
                <p id={`${fieldId}-sg-err`} role="alert" className={styles.confirmError}>
                  Pick a time, or switch this off to give a reason instead.
                </p>
              )}
            </div>
          </div>
        )}
        {offering && (
          <SuggestTimeStep
            booking={b}
            mentorId={viewerId}
            accountZone={accountZone}
            timeZone={timeZone}
            value={suggested}
            onChange={(v) => {
              setSuggested(v);
              setOfferBad(false);
            }}
          />
        )}

        {/* One question at a time: offering a time replaces giving a reason,
            which is how the design draws it and what the server accepts. */}
        {!offering && (
        <ReasonField
          side={b.side}
          label={REASON_LABELS[action]}
          placeholder={PLACEHOLDERS[action][isMentor ? 'mentor' : 'mentee']}
          reasonCode={reasonCode}
          onReasonCode={(v) => {
            setReasonCode(v);
            // The text is never cleared by a tap (owner, 2026-10-12). Tapping
            // chips is how someone explores the options, and losing what they
            // wrote to an exploratory tap — with no undo — is the worse
            // failure. It survives unpicking, re-picking and switching away,
            // and comes back untouched. What stops it travelling invisibly is
            // the payload below, not the field.
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
          error={reasonBad}
          groupRef={firstChipRef}
          noteRef={noteRef}
        />
        )}

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
