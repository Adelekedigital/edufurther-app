import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Tag } from '@/components/atoms/Tag/Tag';
import { cx } from '@/lib/utils/cx';
import { formatNextAvailable } from '@/lib/utils/format';
import type { Mentor, ProfileSessionType } from '@/types/mentor';
import styles from './BookSessionCard.module.css';

type BookSessionCardProps = {
  mentor: Mentor;
  sessionTypes: ProfileSessionType[];
  /** Opens the shared booking modal, on that offering when one is given. */
  onBook: (sessionTypeId?: string) => void;
  /** Switches to the Sessions tab. */
  onCompare: () => void;
  bookBlocked: string | null;
  timeZone: string;
};

/**
 * The profile's booking card. PROVISIONAL (design request #32): product wants
 * one booking experience everywhere, so the design's in-card date tiles, time
 * grid and "Request sent" are not built — every Book opens BookingModal.
 * The card keeps the design's header and the "Next available" shortcut.
 */
export function BookSessionCard({
  mentor,
  sessionTypes,
  onBook,
  onCompare,
  bookBlocked,
  timeZone,
}: BookSessionCardProps) {
  if (sessionTypes.length === 0) return null;

  if (sessionTypes.length === 1) {
    const s = sessionTypes[0]!;
    return (
      <section className={styles.card} aria-labelledby="book-h">
        <div className={styles.single}>
          <div className={styles.headRow}>
            <div className={styles.headText}>
              <h2 id="book-h" className={styles.h2}>
                {s.name}
              </h2>
              <span className={styles.meta}>
                <span className={styles.metaItem}>
                  <Icon name="schedule" size={14} />
                  {s.durationMin} min
                </span>
                <span className={styles.metaItem}>
                  <Icon name="videocam" size={14} />
                  {s.venue}
                </span>
              </span>
            </div>
            <Tag tone="free">Free</Tag>
          </div>
          <Availability
            mentor={mentor}
            timeZone={timeZone}
            onBook={() => onBook(s.id)}
            blocked={!!bookBlocked}
          />
          <Button fullWidth disabled={!!bookBlocked} onClick={() => onBook(s.id)}>
            {bookBlocked ?? 'Book a session'}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card} aria-labelledby="book-h">
      <div className={styles.multiHead}>
        <h2 id="book-h" className={styles.h2}>
          Book a session
        </h2>
        <span className={styles.sub}>{sessionTypes.length} session types</span>
      </div>
      <Availability
        mentor={mentor}
        timeZone={timeZone}
        onBook={() => onBook()}
        blocked={!!bookBlocked}
        inset
      />
      <ul className={styles.rows}>
        {sessionTypes.slice(0, 2).map((s) => (
          <li key={s.id} className={styles.row}>
            <div className={styles.rowTop}>
              <h3 className={styles.rowName}>{s.name}</h3>
              <span className={styles.free}>Free</span>
            </div>
            {s.description && <p className={styles.rowDesc}>{s.description}</p>}
            <div className={styles.rowFoot}>
              <span className={styles.metaItem}>
                <Icon name="schedule" size={14} />
                {s.durationMin} min
              </span>
              <Button disabled={!!bookBlocked} onClick={() => onBook(s.id)}>
                Book
                <span className="sr-only"> {s.name}</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.compare} onClick={onCompare}>
        {sessionTypes.length > 2 ? `See all ${sessionTypes.length} sessions` : 'Compare sessions'}
        <Icon name="arrow_forward" size={16} />
      </button>
    </section>
  );
}

/**
 * "Next available: Wed, Sep 30, 1:30 am" as the design's dashed shortcut into
 * booking, from the same figure the Explore card shows. "No open times at the
 * moment" only when the backend says there are none (Explore rule).
 */
function Availability({
  mentor,
  timeZone,
  onBook,
  blocked,
  inset,
}: {
  mentor: Mentor;
  timeZone: string;
  onBook: () => void;
  blocked: boolean;
  inset?: boolean;
}) {
  if (mentor.nextAvailableState === 'open' && mentor.nextAvailableAt) {
    return (
      <button
        type="button"
        className={cx(styles.next, inset && styles.inset)}
        onClick={onBook}
        disabled={blocked}
      >
        <Icon name="bolt" size={18} className={styles.nextIcon} />
        <span>
          <strong>Next available:</strong> {formatNextAvailable(mentor.nextAvailableAt, timeZone)}
        </span>
      </button>
    );
  }
  if (mentor.nextAvailableState === 'none') {
    return (
      <p className={cx(styles.none, inset && styles.inset)}>
        <Icon name="event_busy" size={16} />
        No open times at the moment
      </p>
    );
  }
  return null;
}
