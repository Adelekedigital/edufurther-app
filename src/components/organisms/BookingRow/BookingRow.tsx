import type { ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { BookingDayBadge } from '@/components/molecules/BookingDayBadge/BookingDayBadge';
import { BookingStatusTag } from '@/components/molecules/BookingStatusTag/BookingStatusTag';
import { AnswerPreview } from '@/components/molecules/AnswerPreview/AnswerPreview';
import { DeadlinePill } from '@/components/molecules/DeadlinePill/DeadlinePill';
import {
  bookingHeading,
  fullDate,
  isLapsed,
  otherTimeLine,
  timeRange,
  waitingPill,
} from '@/lib/utils/bookings';
import { RowMenu, type RowMenuItem } from '@/components/molecules/RowMenu/RowMenu';
import { cx } from '@/lib/utils/cx';
import type { Booking } from '@/types/booking';
import styles from './BookingRow.module.css';

type BookingRowProps = {
  booking: Booking;
  /** The viewer's zone. Every time on the row is read in it. */
  timeZone: string;
  /** The row's controls. Nothing renders where a tab has no action yet. */
  actions?: ReactNode;
  /** The ⋯ menu's items. Nothing renders when there are none. */
  menu?: RowMenuItem[];
  /** Its details are the ones on show: the design's --blue-50 ground. */
  selected?: boolean;
  /**
   * Opens the details panel with every answer shown. Absent on History, where
   * the design does not show the preview at all.
   */
  onOpenAnswers?: () => void;
  /** The panel the preview's button reveals. */
  answersControls?: string;
  /** Injected in tests and stories; the clock otherwise. */
  now?: Date;
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
  menu,
  selected,
  onOpenAnswers,
  answersControls,
  now = new Date(),
}: BookingRowProps) {
  const past = b.status !== 'confirmed' && b.status !== 'pending';
  const lapsed = isLapsed(b, now);
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
        {b.answersPreview && onOpenAnswers && (
          <AnswerPreview
            preview={b.answersPreview}
            onOpenAll={onOpenAnswers}
            controls={answersControls}
          />
        )}
      </div>
      {!!actions && <div className={styles.actions}>{actions}</div>}
      {!!menu?.length && (
        <div className={styles.menuCorner}>
          <RowMenu
            label={`More options for ${bookingHeading(b)}`}
            items={menu}
            trigger={{ icon: 'more_horiz', size: 20, className: styles.more }}
          />
        </div>
      )}
    </div>
  );
}
