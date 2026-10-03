import type { ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { BookingDayBadge } from '@/components/molecules/BookingDayBadge/BookingDayBadge';
import { BookingStatusTag } from '@/components/molecules/BookingStatusTag/BookingStatusTag';
import { RespondBadge } from '@/components/molecules/RespondBadge/RespondBadge';
import {
  bookingHeading,
  fullDate,
  isLapsed,
  otherTimeLine,
  respondDeadline,
  timeRange,
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
  now = new Date(),
}: BookingRowProps) {
  const past = b.status !== 'confirmed' && b.status !== 'pending';
  const lapsed = isLapsed(b, now);
  // A mentee's own request is waiting on the mentor; the mentor's is waiting on
  // them, and gets a countdown instead.
  const waiting = b.status === 'pending' && b.side === 'mentee' && !lapsed;
  const countdown = b.status === 'pending' && b.side === 'mentor' && !lapsed;
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
        {waiting && (
          <span className={styles.waiting}>
            <Icon name="hourglass_top" size={14} />
            Waiting for {b.other.firstName} to confirm
          </span>
        )}
        {countdown && (
          <RespondBadge deadline={respondDeadline(b)} now={now} className={styles.badge} />
        )}
      </div>
      {(actions || !!menu?.length) && (
        <div className={styles.actions}>
          {actions}
          {!!menu?.length && (
            <RowMenu
              label={`More options for ${bookingHeading(b)}`}
              items={menu}
              trigger={{ icon: 'more_horiz', size: 20, className: styles.more }}
            />
          )}
        </div>
      )}
    </div>
  );
}
