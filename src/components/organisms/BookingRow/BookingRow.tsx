import type { ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { BookingDayBadge } from '@/components/molecules/BookingDayBadge/BookingDayBadge';
import { BookingStatusTag } from '@/components/molecules/BookingStatusTag/BookingStatusTag';
import { AnswerPreview } from '@/components/molecules/AnswerPreview/AnswerPreview';
import { DeadlinePill } from '@/components/molecules/DeadlinePill/DeadlinePill';
import {
  isLapsed,
  bookingHeading,
  fullDate,
  otherTimeLine,
  timeRange,
  waitingPill,
} from '@/lib/utils/bookings';
import { cx } from '@/lib/utils/cx';
import type { Booking } from '@/types/booking';
import styles from './BookingRow.module.css';

type BookingRowProps = {
  booking: Booking;
  /** The viewer's zone. Every time on the row is read in it. */
  timeZone: string;
  /** The row's controls. Nothing renders where a tab has no action yet. */
  actions?: ReactNode;
  /**
   * A full-width block under the row's detail — a clash warning, or why an
   * action just failed. Separate from `actions`, which is a button rail sized
   * for nowrap controls: a block in there collapses the content column.
   */
  notice?: ReactNode;
  /**
   * Opens this booking's details panel. The row's primary action, so it is a
   * labelled button in the corner rather than an item in a menu.
   */
  onOpenDetails?: () => void;
  /** Its details are the ones on show: the design's --blue-50 ground. */
  selected?: boolean;
  /**
   * Opens the details panel with every answer shown. Absent on History, where
   * the design does not show the preview at all.
   */
  onOpenAnswers?: () => void;
  /**
   * The details panel's id, where it is mounted — both of the row's
   * disclosures point at it, so neither names an element that does not exist.
   */
  answersControls?: string;
  /** Injected in tests and stories; the clock otherwise. */
  now?: Date;
  /**
   * Whether this row is in History. Passed by the list, which is what put it
   * there — a row must not decide it from a clock. Omitted (stories, and any
   * standalone use) it falls back to the status, which is the same answer for
   * everything but a request that has lapsed without the API saying so yet.
   */
  inHistory?: boolean;
};

/**
 * One booking in a list (Bookings.dc.html `layout=agendaV2`).
 *
 * Presentational: it decides what a booking *says*, never what happens to it.
 * The screen passes the controls, so the same row serves Upcoming, Pending and
 * History without knowing which it is in.
 */
export function BookingRow({
  booking: b,
  timeZone,
  actions,
  notice,
  onOpenDetails,
  selected,
  onOpenAnswers,
  answersControls,
  now = new Date(),
  inHistory,
}: BookingRowProps) {
  // The tag follows the deadline, not the list: the moment `respond_by` passes
  // this request is dead, accept and decline already 409, and saying so at once
  // is the honest thing even while it is still sitting in Pending's cached
  // list. The layout below is the opposite — it must not move under someone
  // mid-read. Same fact, two different right answers.
  const lapsed = isLapsed(b, now);
  // Whether this reads as over: it carries the full date its neighbours carry,
  // and drops the "their time" line nobody can act on.
  //
  // The list says so, because the list is what decided where the row went.
  // Deriving it here from `isLapsed` instead meant the screen's minute clock
  // could flip a row that was still sitting in the Pending tab's cached list
  // into History's layout underneath the Pending heading — full date and no
  // other-party line, both recorded as History-only (GitHub review, PR 235).
  const past = inHistory ?? (b.status !== 'confirmed' && b.status !== 'pending');
  // One pill for both sides: what is left to do, and how long is left to do it.
  const pill = waitingPill(b, now);
  const other = otherTimeLine(b, timeZone);

  return (
    <div className={cx(styles.row, selected && styles.selected)}>
      <BookingDayBadge startsAt={b.startsAt} timeZone={timeZone} />
      <div className={styles.content}>
        <span className={styles.title}>
          <span className={styles.heading}>{bookingHeading(b)}</span>
          <BookingStatusTag status={b.status} />
          {lapsed && <BookingStatusTag status="expired" />}
        </span>
        <span className={styles.meta}>
          <span className={styles.metaItem}>
            <Icon name="schedule" size={14} />
            {past ? `${fullDate(b.startsAt, timeZone)} · ` : ''}
            {timeRange(b, timeZone)}
          </span>
        </span>
        {/* What time this is for them. Not on a past session: nobody can act on
            it any more, and the design leaves it off History too. */}
        {!past && other && (
          <span className={styles.meta}>
            <span className={styles.metaItem}>
              <Icon name={other.odd ? 'bedtime' : 'public'} size={14} />
              {other.text}
            </span>
          </span>
        )}
        {pill && (
          <DeadlinePill icon={pill.icon} urgent={pill.urgent} className={styles.badge}>
            {pill.text}
          </DeadlinePill>
        )}
        {/* What the mentee answered, in brief. Rides along on the list
            response, so a page of rows makes no extra requests. */}
        {notice}
        {b.answersPreview?.first.text && onOpenAnswers && (
          <AnswerPreview
            preview={b.answersPreview}
            onOpenAll={onOpenAnswers}
            controls={answersControls}
            forBooking={bookingHeading(b)}
          />
        )}
      </div>
      {/* Before the actions in the DOM because below 1100px the actions take
          their own line underneath, and Details keeps the corner above them —
          tabbing down and then back up to it is the bug this order avoids. On
          wider screens `order` swaps them back, horizontally, within one line. */}
      {onOpenDetails && (
        <button
          type="button"
          onClick={onOpenDetails}
          // Named per booking: a list of rows all reading "Details" tells a
          // screen-reader user which control they are on and nothing else.
          aria-label={`Details for ${bookingHeading(b)}`}
          aria-controls={answersControls}
          className={styles.details}
        >
          Details
          <Icon name="chevron_right" size={18} />
        </button>
      )}
      {!!actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
