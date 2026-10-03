import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
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
} from '@/lib/utils/bookings';
import { zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import type { BookingOutcome } from '@/lib/api/data/sessionEvents';
import type { Booking } from '@/types/booking';
import styles from './BookingDetails.module.css';

type BookingDetailsProps = {
  booking: Booking;
  timeZone: string;
  /** Names the panel's heading, so the aside and the sheet can share an id. */
  titleId: string;
  onClose: () => void;
  /** Why it ended as it did. History rows only; null while loading or absent. */
  outcome?: BookingOutcome | null;
  onJoin?: () => void;
  joining?: boolean;
  now?: Date;
};

/** "Amara cancelled it" / "You withdrew it" / "It expired", for the reason block. */
function outcomeHeading(o: BookingOutcome, b: Booking): string {
  const them = b.other.firstName;
  const verb: Record<BookingOutcome['status'], string> = {
    cancelled: 'cancelled this session',
    declined: 'declined this request',
    withdrawn: 'withdrew this request',
    expired: 'expired',
    noShow: 'was missed',
    completed: '',
    confirmed: '',
    pending: '',
  };
  if (o.status === 'expired') return 'Nobody answered in time';
  if (o.status === 'noShow') return 'This session was missed';
  if (o.by === 'system') return `This session ${verb[o.status]}`;
  return `${o.by === 'you' ? 'You' : them} ${verb[o.status]}`;
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
  onJoin,
  joining,
  now = new Date(),
}: BookingDetailsProps) {
  const status = panelStatus(b, now);
  const other = otherTimeLine(b, timeZone);
  const join = joinState(b, now);
  const opensIn = joinOpensInMinutes(b);
  const showJoin = !!onJoin && (join === 'open' || join === 'before');

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

        {b.note && (
          <div className={styles.notes}>
            <span className={styles.label}>
              {b.side === 'mentee' ? 'What you asked for' : `Notes from ${b.other.firstName}`}
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
            {outcome.reason && <p className={styles.reason}>“{outcome.reason}”</p>}
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
          <Button
            variant="primary"
            size="large"
            fullWidth
            onClick={onJoin}
            busy={joining}
            disabled={join === 'before'}
          >
            Join session
          </Button>
          {join === 'before' && opensIn != null && (
            <span className={styles.lock}>Join opens {opensIn} minutes before</span>
          )}
        </div>
      )}
    </>
  );
}
