import type { ReactNode } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { AnswerItem } from '@/components/molecules/AnswerItem/AnswerItem';
import { SuggestionNotice } from '@/components/organisms/SuggestionNotice/SuggestionNotice';
import { DetailFacts, type Fact } from '@/components/molecules/DetailFacts/DetailFacts';
import { cx } from '@/lib/utils/cx';
import {
  attendanceLine,
  fullDate,
  joinOpensInMinutes,
  joinState,
  otherTimeLine,
  panelStatus,
  timeRange,
  refundOnCancel,
  refundWindowFor,
  showedUp,
  partyLine,
} from '@/lib/utils/bookings';
import { zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import type { BookingOutcome } from '@/lib/api/data/sessionEvents';
import type { AnswerFile, Booking, BookingAnswer } from '@/types/booking';
import styles from './BookingDetails.module.css';

/** Two answers, then "Show all N" — the design's own count. */
const ANSWER_PREVIEW = 2;

/** Ties the disclosure button to what it reveals. */
const ANSWERS_ID = 'booking-answers';

type BookingDetailsProps = {
  booking: Booking;
  timeZone: string;
  /** Names the panel's heading, so the aside and the sheet can share an id. */
  titleId: string;
  onClose: () => void;
  /** Why it ended as it did. History rows only; null while loading or absent. */
  outcome?: BookingOutcome | null;
  /**
   * The reason could not be fetched. Said out loud rather than left to read as
   * "nobody wrote one" — absence and failure look identical otherwise, and
   * this block is the reason a past booking gets opened.
   */
  outcomeFailed?: boolean;
  retryOutcome?: () => void;
  /** The session's own page, where joining happens. Absent: no Join here at all. */
  joinHref?: string;
  /** The reason is still being fetched: the block has a shape, not a gap. */
  outcomeLoading?: boolean;
  /** What the mentee wrote on the booking form (GET /sessions/{id}/answers). */
  answers?: BookingAnswer[] | null;
  answersLoading?: boolean;
  answersFailed?: boolean;
  retryAnswers?: () => void;
  /**
   * Opens the booking flow on an offered time. Absent, the notice still shows
   * what was offered — it simply has nothing to press.
   */
  onBookSuggestion?: () => void;
  /** All of them, rather than the first two. */
  answersExpanded?: boolean;
  onToggleAnswers?: () => void;
  onOpenFile?: (file: AnswerFile) => void;
  now?: Date;
};

/**
 * "Amara cancelled this session" / "You withdrew this request" / "Nobody
 * answered in time". A sweep has no name, so its sentence is passive rather
 * than blaming the session for acting on itself.
 */
/**
 * What happened to the credit, and nothing else (design's table, 2026-10-03).
 *
 * Only the mentee's side: it is their credit, and a mentor seeing credit copy
 * is the rule design set. The *who did it* half of the design's line is already
 * the heading above, so repeating it here printed the same sentence twice —
 * and keying it off `b.side` while the heading keys off `o.by` meant a
 * system-swept decline told a mentor "You declined this request" when they had
 * not.
 */
function creditLine(o: BookingOutcome, b: Booking, now: Date): string {
  if (b.side !== 'mentee') return '';
  switch (o.status) {
    case 'declined':
    case 'expired':
    case 'withdrawn':
      return 'Your credit is back.';
    case 'cancelled': {
      // Against **when they cancelled**, not now. A past cancellation judged
      // by today's clock is always "less than the window before the start",
      // so every mentee who cancelled in good time was told their credit had
      // not come back — a false statement about money, on every old row.
      const at = Date.parse(o.at);
      const when = Number.isNaN(at) ? now : new Date(at);
      return refundOnCancel(b, when)
        ? 'Your credit is back.'
        : `This was cancelled less than ${refundWindowFor(b)} hours before the session, so the credit was not returned.`;
    }
    default:
      return '';
  }
}

function outcomeHeading(o: BookingOutcome, b: Booking): string {
  if (o.status === 'expired') return 'Nobody answered in time';
  if (o.status === 'noShow') {
    // Who was there is the whole difference between these, and the rows carry
    // it. `null` is genuinely unknown — two migrated bookings have no
    // attendance record — so it says the plain thing rather than guess.
    const came = showedUp(b);
    if (came === false) return 'Neither of you joined this session';
    if (came === true)
      return b.myAttendance === 'noShow'
        ? 'You didn’t join this session'
        : `${b.other.firstName} didn’t join this session`;
    return 'This session was missed';
  }
  const WORDS: Partial<Record<BookingOutcome['status'], { did: string; done: string }>> = {
    cancelled: { did: 'cancelled this session', done: 'This session was cancelled' },
    declined: { did: 'declined this request', done: 'This request was declined' },
    withdrawn: { did: 'withdrew this request', done: 'This request was withdrawn' },
  };
  const words = WORDS[o.status];
  if (!words) return '';
  if (o.by === 'system') return words.done;
  return `${o.by === 'you' ? 'You' : b.other.firstName} ${words.did}`;
}

/**
 * The details panel's contents (Bookings.dc.html), shared by the desktop aside
 * and the phone sheet — the two differ in their frame, never in what they say.
 *
 * The design pairs Join with "Send a message", and Cancel, Accept and Decline
 * sit in this footer too. Only Join is here: the message control has no
 * endpoint, and the write actions are PR 3. A footer with nothing in it does
 * not render at all.
 */
export function BookingDetails({
  booking: b,
  timeZone,
  titleId,
  onClose,
  outcome,
  outcomeFailed,
  retryOutcome,
  outcomeLoading,
  answers,
  answersLoading,
  answersFailed,
  retryAnswers,
  answersExpanded,
  onBookSuggestion,
  onToggleAnswers,
  onOpenFile,
  joinHref,
  now = new Date(),
}: BookingDetailsProps) {
  const status = panelStatus(b, now);
  const other = otherTimeLine(b, timeZone);
  const join = joinState(b, now);
  const opensIn = joinOpensInMinutes(b);
  const showJoin = !!joinHref && (join === 'open' || join === 'before');
  const answersTitle = b.side === 'mentee' ? 'Your answers' : `Answers from ${b.other.firstName}`;
  const credit = outcome ? creditLine(outcome, b, now) : '';
  // Collapsed, the preview shows the first two **answered** questions, not
  // the first two in form order. A mentee who skipped the opening questions
  // would otherwise be previewed as two "No answer" rows — reading as "they
  // told us nothing" while three paragraphs sat behind the toggle. This is
  // also what the row advertises: `answers_preview.first` is the first
  // answered question, "skipping any blank before it".
  //
  // Expanded shows every question in form order, blanks included, because
  // that is the record of what was asked.
  const allAnswers = answers ?? [];
  const answeredOnly = allAnswers.filter((a) => a.answered);
  const collapsed = answeredOnly.slice(0, ANSWER_PREVIEW);
  const shownAnswers = answersExpanded ? allAnswers : collapsed;
  // Whether collapsing would hide anything — not whether anything is hidden
  // *now*. Comparing against the current view made the toggle disappear once
  // expanded, stranding the panel open with no way back.
  const hasMore = allAnswers.length > collapsed.length;

  const facts: Fact[] = [
    { icon: 'calendar_today', text: fullDate(b.startsAt, timeZone) },
    { icon: 'schedule', text: `${timeRange(b, timeZone)} · ${zoneLabel(timeZone)}` },
  ];
  if (other) facts.push({ icon: other.odd ? 'bedtime' : 'public', text: other.text });

  return (
    <>
      <div className={styles.body}>
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            Booking details
          </h2>
          <button type="button" aria-label="Close details" onClick={onClose} className={styles.close}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className={styles.who}>
          <Avatar
            size="md"
            initials={b.other.initials}
            tone={b.other.deleted ? 'plain' : b.other.cover}
            src={b.other.avatarUrl}
            focus={b.other.avatarFocus}
            alt=""
          />
          <span className={styles.whoText}>
            <span className={styles.name}>{b.other.name}</span>
            {/* Who they are, where there is anything to say (backend #409).
                Above the role line because it is the more human fact. */}
            {partyLine(b.other) && (
              <span className={styles.label}>{partyLine(b.other)}</span>
            )}
            <span className={styles.label}>{attendanceLine(b)}</span>
          </span>
        </div>

        <DetailFacts facts={facts} />

        {b.title && (
          <div className={styles.block}>
            <span className={styles.label}>Session</span>
            <span className={styles.value}>{b.title}</span>
          </div>
        )}

        {/* An offer of another time is the one thing on a booking that ended
            that the mentee can still act on, so it comes before the record of
            how it ended. Mentors do not see it: they made it. */}
        {b.suggestion && b.side === 'mentee' && (
          <SuggestionNotice
            suggestion={b.suggestion}
            firstName={b.other.firstName}
            timeZone={timeZone}
            // A migrated booking records no offering, so there is nothing to
            // open — but the offer itself still happened and still says when.
            onBook={onBookSuggestion}
            now={now}
          />
        )}

        {/* What the mentee wrote on the booking form. Replaces the single
            "Notes from…" block: the form is what they actually said, and
            booking_message was only ever the first of it. */}
        {answersLoading && (
          <div className={styles.notes} aria-hidden="true">
            <Skeleton height="16px" width="45%" />
            <Skeleton height="16px" />
            <Skeleton height="16px" width="70%" />
          </div>
        )}
        {!answersLoading && answersFailed && (
          <div className={styles.notes} role="alert">
            <span className={styles.label}>We couldn’t load the answers.</span>
            {retryAnswers && (
              <button type="button" onClick={retryAnswers} className={styles.retry}>
                Try again
              </button>
            )}
          </div>
        )}
        {/* The row promised a count from `answers_preview`; if the list comes
            back empty the panel must say so rather than show an unexplained
            absence, which reads as data loss. */}
        {!answersLoading && !answersFailed && answers?.length === 0 && !!b.answersPreview && (
          <p className={styles.note}>These answers are no longer available.</p>
        )}
        {!answersLoading && !answersFailed && !!answers?.length && (
          /* A div, not a <section aria-label>: inside a dialog a labelled
             section reads as a duplicate page landmark (the same decision
             ModalShell records for its header and footer). */
          <div className={styles.answers}>
            <h3 className={styles.answersTitle} id={ANSWERS_ID}>
              {answersTitle}
            </h3>
            {/* Every question left blank. Collapsed, the preview would be a
                heading with nothing under it, which reads as a failed load
                rather than as a form nobody filled in. The toggle below still
                opens the questions that were asked. */}
            {shownAnswers.length === 0 && (
              <p className={styles.note}>
                {b.side === 'mentee'
                  ? 'You didn’t answer the questions on this form.'
                  : `${b.other.firstName} didn’t answer any of the questions.`}
              </p>
            )}
            {shownAnswers.map((a) => (
              <AnswerItem key={a.questionId} answer={a} onOpenFile={onOpenFile} />
            ))}
            {hasMore && onToggleAnswers && (
              <button
                type="button"
                onClick={onToggleAnswers}
                className={styles.ansMore}
                aria-expanded={!!answersExpanded}
                aria-controls={ANSWERS_ID}
              >
                {/* "questions", not "answers": the list counts every
                    question asked, and some carry no answer. Offering to
                    "show all 7 answers" and then showing three answers and
                    four blanks is a claim the panel cannot keep. */}
                {answersExpanded ? 'Show less' : `Show all ${allAnswers.length} questions`}
              </button>
            )}
          </div>
        )}
        {/* The note is a separate field from the form, not a copy of it
            (backend, 2026-10-03): a mentee may write one, answer a form, or
            both, and a migrated booking has only this. It follows the answers
            because it is the bit they added rather than the bit they were
            asked. */}
        {b.note && (
          <div className={styles.notes}>
            <span className={styles.label}>
              {b.side === 'mentee' ? 'Your note' : `Note from ${b.other.firstName}`}
            </span>
            <p className={styles.note}>{b.note}</p>
          </div>
        )}

        {/* Why it ended this way — the one thing a past booking is opened for,
            and the only place the API keeps it. Absent when nobody wrote a
            reason, which is silence rather than an error. */}
        {outcome && (
          <div className={styles.notes}>
            <span className={styles.label}>{outcomeHeading(outcome, b)}</span>
            {/* Where the credit went. The heading above already says who did
                what, so this adds the half the heading cannot carry. */}
            {credit && <p className={styles.outcomeLine}>{credit}</p>}
            {/* "Reason from X", not "X's note": the booking note sits in this
                same panel under "Note from X", and the two would blur. The
                block is left out entirely when no reason was given — never
                "No reason given". */}
            {outcome.reason && (
              <>
                <span className={styles.label}>
                  {outcome.by === 'you' ? 'Your reason' : `Reason from ${b.other.firstName}`}
                </span>
                <p className={styles.reason}>“{outcome.reason}”</p>
              </>
            )}
          </div>
        )}
        {!outcome && outcomeLoading && (
          <div className={styles.notes} aria-hidden="true">
            <Skeleton height="16px" width="55%" />
            <Skeleton height="16px" />
          </div>
        )}
        {!outcome && !outcomeLoading && outcomeFailed && (
          <div className={styles.notes} role="alert">
            <span className={styles.label}>We couldn’t load why this ended.</span>
            {retryOutcome && (
              <button type="button" onClick={retryOutcome} className={styles.retry}>
                Try again
              </button>
            )}
          </div>
        )}

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <span className={styles.label}>Status</span>
            <span className={cx(styles.status, styles[status.tone])}>{status.label}</span>
          </span>
          <span className={styles.metaItem}>
            <span className={styles.label}>Booked on</span>
            <span className={styles.metaValue}>{fullDate(b.createdAt, timeZone)}</span>
          </span>
        </div>
      </div>

      {showJoin && (
        <div className={styles.footer}>
          {/* It navigates once open, so it is a link; before that, a locked button. */}
          {join === 'open' ? (
            <ButtonLink href={joinHref!} prefetch={false} variant="primary" size="large" fullWidth>
              Join session
            </ButtonLink>
          ) : (
            <Button variant="primary" size="large" fullWidth disabled>
              Join session
            </Button>
          )}
          {join === 'before' && opensIn != null && (
            <span className={styles.lock}>Join opens {opensIn} minutes before</span>
          )}
        </div>
      )}
    </>
  );
}
