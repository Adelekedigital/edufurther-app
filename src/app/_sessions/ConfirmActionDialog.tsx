'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Switch } from '@/components/atoms/Switch/Switch';
import { ReasonField } from '@/components/molecules/ReasonField/ReasonField';
import { Notice } from '@/components/molecules/Notice/Notice';
import { reasonError } from '@/lib/utils/reasons';
import { slotLabel } from './SlotPicker';
import {
  HOLD_HOURS,
  SuggestTimeStep,
  moveDraft,
  moveSentence,
  offerSentence,
  suggestDraft,
  swapSentence,
} from './SuggestTimeStep';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import type { ActionInput, BookingAction } from '@/lib/api/data/bookingActions';
import { canCancel, refundOnCancel, refundWindowFor } from '@/lib/utils/bookings';
import { dayLabel, formatTime } from '@/lib/utils/format';
import { MOVE_COPY } from '@/lib/copy/session';
import type { AppError, SessionType } from '@/types/mentor';
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
  /**
   * The mentee's move (PRD fix 1), Session Join only: given with the session's
   * type as the mentor offers it now (unknown: not given), or `loading` while
   * that is still being read. The dialog opens on it while the session is
   * confirmed and cancelling still refunds by the row's own deadline;
   * otherwise, or switched off, it is the cancel as built.
   */
  move?: MoveOption | 'loading';
};

export type MoveOption = {
  sessionType: SessionType;
  onMove: (input: { startsAt: string; message: string }) => void;
  /** The whole sequence is running (prepare, cancel, book), or it has landed and the page is leaving. */
  pending: boolean;
  /** Why it stopped before anything changed, in our words. */
  error: string | null;
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

/**
 * "Sat, Oct 3, 12:00 am" in the viewer's zone: the server's deadline, or the
 * start less the window when an older row has none.
 */
function refundDeadlineLabel(b: Booking, timeZone: string): string {
  const at =
    b.refundUntil ??
    new Date(new Date(b.startsAt).getTime() - refundWindowFor(b) * 3_600_000).toISOString();
  return `${dayLabel(at, timeZone)}, ${formatTime(at, timeZone)}`;
}

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
  move: moveProp,
}: ConfirmActionDialogProps) {
  const move = moveProp === 'loading' ? undefined : moveProp;
  const [reasonCode, setReasonCode] = useState<PickableReason | null>(null);
  const [text, setText] = useState('');
  // Mentors only. The default is `true` because the two ways of being wrong are
  // not equally visible: an hour offered while you are busy arrives as a booking
  // you can decline; an hour withheld while you are free arrives as nothing.
  // Whether the hour goes back on the mentor's public calendar. **Blocked by
  // default** (owner, 2026-10-13, `freeStyle="line"`), freed only by pressing
  // "Reopen it". This reverses the old default, which was `true` on the
  // argument that "an hour offered while you are busy arrives as a booking you
  // can decline; an hour withheld while you are free arrives as nothing". The
  // owner has taken the other side of that trade knowingly.
  const [free, setFree] = useState(false);
  const [suggested, setSuggested] = useState<string | null>(null);
  // `null` while the drafted message is still ours, which is what lets it
  // follow the picked slot. Anything else is the mentor's own — including `''`,
  // a box they deliberately emptied.
  const [message, setMessage] = useState<string | null>(null);
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
  // The mentee's move: on by default, as the design draws it.
  const [moveOn, setMoveOn] = useState(true);
  const [newTime, setNewTime] = useState<string | null>(null);
  // `null` while the draft is still ours, as `message` above.
  const [moveMessage, setMoveMessage] = useState<string | null>(null);
  const [moveBad, setMoveBad] = useState(false);
  const moveSwitchRef = useRef<HTMLButtonElement>(null);

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
  // Offered only while the credit comes back (12+ hours out) by the row's own
  // deadline: a move later would cost a second credit, so the plain cancel
  // shows (owner default, open question 1), and with no deadline on the row
  // there is no guessing one from the device clock. Re-read on every tick,
  // like `tooLate`.
  const moveFits =
    action === 'cancel' &&
    !isMentor &&
    b.status === 'confirmed' &&
    !!b.refundUntil &&
    refunds &&
    !tooLate;
  const canMove = !!move && moveFits;
  // Latched while it runs: the deadline passing mid-move must not swap in the
  // plain cancel under "Working…".
  const moving = (canMove && moveOn) || !!move?.pending;
  const request = !!move?.sessionType.requiresConfirmation;
  const moveDrafted = newTime
    ? moveDraft({ first, origDay: when.day, slot: slotLabel(newTime, timeZone), request })
    : '';
  const moveText = moveMessage ?? moveDrafted;
  const busy = !!move?.pending;
  // Rebuilt from whichever slot is picked, so an untouched box always names the
  // time actually on offer. Nothing drafted until there is a time to draft
  // about — the box is not on screen before then either.
  const draft = suggested
    ? suggestDraft({
        first,
        mode: action === 'cancel' ? 'cancel' : 'decline',
        origDay: when.day,
        slot: slotLabel(suggested, timeZone),
      })
    : '';
  const messageText = message ?? draft;
  // Offering a time says "not that hour" — unless the mentor has also said the
  // hour is still free, which only a cancel can say.
  const impliesUnavailable = !(action === 'cancel' && isMentor && free);
  // What the confirm is waiting for, which is also what the server will refuse
  // without: a time, or a reason (backend #417).
  const incomplete = offering ? !suggested : !!reasonError({ reasonCode, text, required: true });

  // Mentors never see credit copy — it is not their credit (design's rule).
  // A refundable cancel names the deadline (`Mentee Bookings.dc.html`): the
  // mentee who keeps the session learns when the credit stops coming back.
  const creditLine = isMentor
    ? null
    : action === 'cancel'
      ? refunds
        ? `Cancel before ${refundDeadlineLabel(b, timeZone)} and your credit comes back. After that, the credit is used.`
        : `This is less than ${refundWindowFor(b)} hours before the session, so the credit is not returned.`
      : 'Your credit comes back.';

  // The design's own sentences. The bold runs are its `<strong>`s.
  const lead =
    action === 'cancel' ? (
      <>
        Are you sure you want to cancel this session with <strong>{b.other.name}</strong> on{' '}
        <strong>{when.day}</strong> at <strong>{when.start}</strong>? They’ll be notified, and this
        action cannot be undone.
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

  // In both views, at the same place and key, so switching keeps it (and its
  // focus): turning it back on from the cancel view is one tap.
  const moveSwitch = move && (
    <div key="move-switch" className={styles.slotChoice}>
      <Switch
        ref={moveSwitchRef}
        checked={moving}
        // Not mid-move: switching off then would show a cancel for a session
        // the running sequence is already canceling.
        disabled={move.pending}
        onChange={(v) => {
          setMoveOn(v);
          setMoveBad(false);
          setReasonBad(null);
          // The time and the message about it go together, as the mentor's
          // offer does: a time nowhere on screen is never sent.
          if (!v) {
            setNewTime(null);
            setMoveMessage(null);
          }
        }}
        aria-labelledby={`${fieldId}-mv`}
        aria-describedby={moveBad ? `${fieldId}-mv-hint ${fieldId}-mv-err` : `${fieldId}-mv-hint`}
      />
      <div>
        <span id={`${fieldId}-mv`} className={styles.slotLabel}>
          {MOVE_COPY.switchTitle(first)}
        </span>
        <p id={`${fieldId}-mv-hint`} className={styles.slotHint}>
          {MOVE_COPY.switchSub(first, request)}
        </p>
        {moveBad && moving && (
          <p id={`${fieldId}-mv-err`} role="alert" className={styles.moveError}>
            {MOVE_COPY.pickFirst}
          </p>
        )}
      </div>
    </div>
  );

  // The move view (CancelModal.dc.html `move` on, viewer mentee). While the
  // session type is still being read it is a skeleton with only the way out:
  // a reason picked in a cancel view would be under the move view a moment later.
  const moveLoading = moveProp === 'loading' && moveFits;
  if ((moving && move) || moveLoading)
    return (
      <ModalShell
        title={MOVE_COPY.title}
        size="lg"
        tone="danger"
        onClose={onClose}
        sheet={
          isPhone
            ? {
                heading: MOVE_COPY.title,
                leading: { icon: 'close', label: 'Close', onClick: onClose, disabled: busy },
                showClose: false,
              }
            : undefined
        }
        contained={isPhone}
        footer={
          <div className={styles.confirmFooter}>
            <Button
              variant="secondary-outlined"
              size="large"
              aria-disabled={busy || undefined}
              onClick={busy ? undefined : onClose}
            >
              {MOVE_COPY.keep}
            </Button>
            {move ? (
              <Button
                variant="primary"
                size="large"
                // Dimmed with no time (the design's opacity 0.6), but not
                // disabled: pressing it says what is missing and focuses the switch.
                className={!newTime ? styles.moveIncomplete : undefined}
                busy={move.pending}
                onClick={() => {
                  if (!newTime) {
                    setMoveBad(true);
                    requestAnimationFrame(() => moveSwitchRef.current?.focus());
                    return;
                  }
                  move.onMove({ startsAt: newTime, message: moveText });
                }}
              >
                {move.pending ? 'Working…' : MOVE_COPY.confirm(request)}
              </Button>
            ) : (
              <Skeleton height="48px" radius="md" />
            )}
          </div>
        }
      >
        {move ? (
          <div className={styles.confirmBody}>
            <p className={styles.moveLead}>
              {MOVE_COPY.lead.before}
              <strong>{b.other.name}</strong>
              {MOVE_COPY.lead.on}
              <strong>{when.day}</strong>
              {MOVE_COPY.lead.at}
              <strong>{when.start}</strong>
              {MOVE_COPY.lead.after}
            </p>
            {moveSwitch}
            <SuggestTimeStep
              booking={b}
              // The mentor's open times: on a mentee's row, the other party.
              mentorId={b.other.id}
              accountZone={accountZone}
              timeZone={timeZone}
              value={newTime}
              onChange={(v) => {
                // As the mentor's draft: only our sentence naming the time is swapped.
                setMoveMessage((m) =>
                  m === null || !newTime || !v
                    ? null
                    : swapSentence(
                        m,
                        moveSentence(slotLabel(newTime, timeZone), request),
                        moveSentence(slotLabel(v, timeZone), request),
                      ),
                );
                setNewTime(v);
                setMoveBad(false);
              }}
              message={moveText}
              onMessage={setMoveMessage}
              label={MOVE_COPY.pickerLabel}
              hold={false}
              copy={MOVE_COPY.slots(first)}
              now={now}
            />
            {move.error && (
              <p role="alert" className={styles.confirmError}>
                {move.error}
              </p>
            )}
          </div>
        ) : (
          <section className={styles.confirmBody} aria-busy="true" aria-label={MOVE_COPY.loading}>
            <Skeleton height="16px" width="90%" />
            <Skeleton height="64px" radius="lg" />
            <Skeleton height="32px" width="70%" />
          </section>
        )}
      </ModalShell>
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
            incomplete={incomplete && !tooLate}
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
                reasonCode: offering
                  ? impliesUnavailable
                    ? 'mentor_unavailable'
                    : null
                  : reasonCode,
                // Offering a time now sends words too — the drafted message,
                // or whatever the mentor made of it. Before 2026-10-13 this
                // path sent `''` and the mentee received a suggested hour with
                // nothing said about why the agreed one was going away. One
                // field carries both (`reason_text`, 2000 chars), because the
                // two questions are alternatives: a reason or an offer, never
                // both. An emptied box sends `''` and the offer speaks for
                // itself (owner, 2026-10-13).
                //
                // Off the offering path, only "Something else" has words to
                // send. The box is hidden for every other reason, so anything
                // still held in state is something the person cannot see — it
                // must not reach the other party's notification.
                reasonText: offering ? messageText : reasonCode === 'other' ? text : '',
                ...(action === 'cancel' && isMentor ? { releaseSlot: free } : {}),
                ...(offering && suggested ? { suggestedStartsAt: suggested } : {}),
              });
            }}
            // `busy` rather than the aria attributes: the atom owns both, and
            // it also swallows the second click.
            busy={pending}
          >
            {pending ? 'Working…' : offering ? CONFIRMS_OFFERING[action] : CONFIRMS[action]}
          </Button>
        </div>
      }
    >
      <div className={styles.confirmBody}>
        <p className={styles.confirmLead}>{lead}</p>
        {canMove && moveSwitch}
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

        {/* Mentors only — a mentee's cancellation always frees the hour, and a
            request never held one.

            A line rather than a switch (`freeStyle="line"`): this is a
            consequence being reported, with a way to change it, not a setting
            to come and configure. It names the slot by **date and time**,
            because a bare hour reads as every 6 pm rather than this one. */}
        {action === 'cancel' && isMentor && (
          <p className={styles.freeLine}>
            <Icon name={free ? 'event_available' : 'event_busy'} size={18} aria-hidden />
            <span>
              {when.day}, {when.start} slot stays {free ? 'open' : 'blocked'} on your calendar.
            </span>
            <button type="button" className={styles.freeLink} onClick={() => setFree((v) => !v)}>
              {free ? 'Keep it blocked' : 'Reopen it'}
            </button>
          </p>
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
                //
                // The message goes with it, for that reason and one more: it
                // names that time in a sentence, so keeping it would come back
                // offering one hour while describing another.
                if (!v) {
                  setSuggested(null);
                  setMessage(null);
                }
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
              {/* The design's two sentences (CancelModal.dc.html, PRD fix 5).
                  Only a decline promises no approval wait (backend #435): a
                  declined request was never approved, so the offered time skips
                  the wait. A cancel had its approval already, so it names the
                  hold instead. Mentors never see credit copy (owner, 26 Oct). */}
              <p id={`${fieldId}-sg-hint`} className={styles.slotHint}>
                {action === 'decline'
                  ? `${first} books it in one tap, with no wait for your approval.`
                  : `${first} gets one tap to book it, held for ${HOLD_HOURS} hours.`}
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
              // A typed message survives a change of mind about the hour: only
              // the slot text inside it is swapped, which is what the design
              // does (`draft.split(oldLabel).join(newLabel)`). Losing words
              // someone wrote because they picked a different time is the
              // failure worth this much care — there is no undo in a dialog.
              //
              // Untouched (`null`), it simply redraws from the new slot. Taken
              // back altogether, it starts again rather than keeping a sentence
              // about an hour that is no longer on offer.
              setMessage((m) => {
                if (m === null || !suggested || !v) return null;
                // Only the sentence we drafted, and only the first of it. A
                // global replace rewrote every match in the whole box, so a
                // mentor who typed "I was also free around <that time>" had
                // their own words silently changed to name a different hour
                // (GitHub review, PR 234).
                //
                // If they rewrote our sentence themselves it is not found, and
                // their text is then left exactly as written — the chip above
                // still shows which time is actually on offer, and quietly
                // editing someone's prose is the worse of the two.
                return swapSentence(
                  m,
                  offerSentence(slotLabel(suggested, timeZone)),
                  offerSentence(slotLabel(v, timeZone)),
                );
              });
              setSuggested(v);
              setOfferBad(false);
            }}
            message={messageText}
            onMessage={setMessage}
            now={now}
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
            This session starts in less than ten minutes, so it can’t be called off now. Nobody
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
