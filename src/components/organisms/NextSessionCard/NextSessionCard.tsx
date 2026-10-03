import { useId } from 'react';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { RowMenu, type RowMenuItem } from '@/components/molecules/RowMenu/RowMenu';
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
import styles from './NextSessionCard.module.css';

type NextSessionCardProps = {
  booking: Booking;
  timeZone: string;
  /** Records attendance and hands back where to go. */
  onJoin: () => void;
  joining?: boolean;
  /** The ⋯ menu — "See details", as the design's hero has. */
  menu?: RowMenuItem[];
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
  onJoin,
  joining,
  menu,
  now = new Date(),
}: NextSessionCardProps) {
  const when = nextSessionWhen(b, now);
  const state = joinState(b, now);
  const opensIn = joinOpensInMinutes(b);
  const other = otherTimeLine(b, timeZone);
  const lockId = useId();
  const coverLabel =
    // The note, not the form. "What X wants to cover" is the answers preview's
    // label in the new design, so this field takes the panel's wording and the
    // two stop being two names for one thing.
    b.side === 'mentee' ? 'Your note' : `Note from ${b.other.firstName}`;

  return (
    <section aria-label="Next session" className={styles.card}>
      <div className={styles.top}>
        <span className={styles.eyebrow}>Next session</span>
        <span className={cx(styles.when, when.live && styles.live)}>
          <Icon name={when.icon} size={14} />
          {when.label}
        </span>
        {!!menu?.length && (
          <RowMenu
            label={`More options for ${bookingHeading(b)}`}
            items={menu}
            trigger={{ icon: 'more_horiz', size: 20, className: styles.more }}
          />
        )}
      </div>

      <div className={styles.who}>
        <span className={styles.avatar}>
          <Avatar
            size="lg"
            initials={b.other.initials}
            tone={b.other.deleted ? 'plain' : b.other.cover}
            src={b.other.avatarUrl}
            focus={b.other.avatarFocus}
            alt=""
          />
        </span>
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

      {b.note && (
        <div className={styles.note}>
          <span className={styles.noteLabel}>{coverLabel}</span>
          <p className={styles.noteBody}>{b.note}</p>
        </div>
      )}

      {/* A shut window means the session is over bar the backend's bookkeeping;
          a Join that can only fail is worse than none. */}
      {(state === 'open' || state === 'before') && (
        <div className={styles.actions}>
          <Button
            variant="primary"
            size="medium"
            onClick={onJoin}
            busy={joining}
            disabled={state === 'before'}
            aria-describedby={state === 'before' ? lockId : undefined}
          >
            Join session
          </Button>
          {state === 'before' && opensIn != null && (
            <span id={lockId} className={styles.lock}>
              Join opens {opensIn} minutes before
            </span>
          )}
        </div>
      )}
    </section>
  );
}
