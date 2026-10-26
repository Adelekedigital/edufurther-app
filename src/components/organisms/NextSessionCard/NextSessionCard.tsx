import { useId } from 'react';
import { DetailsButton } from '@/components/molecules/DetailsButton/DetailsButton';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { cardClass } from '@/components/atoms/Card/Card';
import { Icon } from '@/components/atoms/Icon/Icon';
import { BOOKINGS_COPY } from '@/lib/copy/bookings';
import { cx } from '@/lib/utils/cx';
import {
  bookingHeading,
  joinOpensInMinutes,
  joinState,
  nextSessionWhen,
  otherTimeLine,
  timeRange,
} from '@/lib/utils/bookings';
import type { Booking } from '@/types/booking';
import { AnswerPreview } from '@/components/molecules/AnswerPreview/AnswerPreview';
import styles from './NextSessionCard.module.css';

type NextSessionCardProps = {
  booking: Booking;
  timeZone: string;
  /** Opens the details panel with every answer shown. */
  onOpenAnswers?: () => void;
  /** The panel that link reveals. */
  answersControls?: string;
  /** The session's own page, where joining happens (Session Join.dc.html). */
  joinHref: string;
  /**
   * Opens the details panel. The hero reads the same way as the rows below it:
   * a labelled control, not a ⋯ hiding one item. Omit it and nothing is drawn.
   */
  onOpenDetails?: () => void;
  /**
   * Whether this booking's panel is the one open. The rows derive it from
   * `selected`; the hero has no such prop, and without it the control would
   * claim to be closed while the panel it opened is on screen.
   */
  detailsOpen?: boolean;
  now?: Date;
};

/** "Sun, Oct 4" — the next session is always near, so the year adds nothing. */
function dateLine(isoInstant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(new Date(isoInstant));
}

/**
 * The next session, as its own card above the list (Bookings.dc.html hero).
 *
 * Only Join lives here. The design pairs it with "Send a message", which has no
 * endpoint and is left out rather than shown dead (backend reply §5).
 */
export function NextSessionCard({
  booking: b,
  timeZone,
  joinHref,
  onOpenDetails,
  detailsOpen,
  onOpenAnswers,
  answersControls,
  now = new Date(),
}: NextSessionCardProps) {
  const when = nextSessionWhen(b, now);
  const state = joinState(b, now);
  const opensIn = joinOpensInMinutes(b);
  const other = otherTimeLine(b, timeZone);
  const lockId = useId();
  // The first booking-form answer, as drawn (PRD Mentor Bookings), under the
  // question as the mentor asked it. A booking with no answers (a migrated one
  // has only a note) shows the note, under the panel's own label for it.
  const preview = b.answersPreview;
  const cover = preview?.first.text
    ? { label: preview.first.question, body: preview.first.text }
    : b.note
      ? {
          label: b.side === 'mentee' ? 'Your note' : `Note from ${b.other.firstName}`,
          body: b.note,
        }
      : null;
  // The way into every answer, whatever the first one says.
  const answersLink = preview && onOpenAnswers && (
    <AnswerPreview
      preview={preview}
      onOpenAll={onOpenAnswers}
      controls={answersControls}
      forBooking={bookingHeading(b)}
      linkOnly
    />
  );

  return (
    <section
      aria-label="Next session"
      className={cardClass({ tone: 'info', className: styles.card })}
    >
      <div className={styles.top}>
        <span className={styles.eyebrow}>Next session</span>
        <span className={cx(styles.when, when.live && styles.live)}>
          <Icon name={when.icon} size={14} />
          {when.label}
        </span>
        {onOpenDetails && (
          <DetailsButton
            name={bookingHeading(b)}
            controls={answersControls}
            expanded={detailsOpen}
            onClick={onOpenDetails}
          />
        )}
      </div>

      <div className={styles.who}>
        <Avatar
          size="lg"
          initials={b.other.initials}
          tone={b.other.deleted ? 'plain' : b.other.cover}
          src={b.other.avatarUrl}
          focus={b.other.avatarFocus}
          ring="thin"
          className={styles.avatar}
          alt=""
        />
        <div className={styles.info}>
          <span className={styles.heading}>{bookingHeading(b)}</span>
          <span className={styles.meta}>
            <span className={styles.metaItem}>
              <Icon name="calendar_today" size={14} />
              {dateLine(b.startsAt, timeZone)}
            </span>
            <span aria-hidden="true" className={styles.dot}>
              ·
            </span>
            <span className={styles.metaItem}>
              <Icon name="schedule" size={14} />
              {timeRange(b, timeZone)}
            </span>
          </span>
          {other && (
            <span className={styles.meta}>
              <span className={styles.metaItem}>
                <Icon name={other.odd ? 'bedtime' : 'public'} size={14} />
                {other.text}
              </span>
            </span>
          )}
        </div>
      </div>

      {cover ? (
        <div className={styles.note}>
          <span className={styles.noteLabel}>{cover.label}</span>
          {/* Isolated: another user's text, which may carry bidi marks. */}
          <p className={styles.noteBody} dir="auto">
            {cover.body}
          </p>
          {/* Inside the box, as drawn: the link to the rest of the form. */}
          {answersLink}
        </div>
      ) : (
        answersLink
      )}

      {/* A shut window means the session is over bar the backend's bookkeeping;
          a Join that can only fail is worse than none. */}
      {(state === 'open' || state === 'before') && (
        <div className={styles.actions}>
          {/* It navigates once open, so it is a link; before that, a locked button. */}
          {state === 'open' ? (
            <ButtonLink href={joinHref} prefetch={false} variant="primary" size="medium">
              Join session
            </ButtonLink>
          ) : (
            <Button variant="primary" size="medium" disabled aria-describedby={lockId}>
              Join session
            </Button>
          )}
          {state === 'before' && opensIn != null && (
            <span id={lockId} className={styles.lock}>
              {BOOKINGS_COPY.joinOpens(opensIn)}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
