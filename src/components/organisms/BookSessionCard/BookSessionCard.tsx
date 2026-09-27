import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Tag } from '@/components/atoms/Tag/Tag';
import type { ProfileSessionType } from '@/types/mentor';
import styles from './BookSessionCard.module.css';

type BookSessionCardProps = {
  sessionTypes: ProfileSessionType[];
  /** Opens the shared booking modal, on that offering when one is given. */
  onBook: (sessionTypeId?: string) => void;
  /** Switches to the Sessions tab. */
  onCompare: () => void;
  bookBlocked: string | null;
};

/**
 * The profile's booking card (design reply #32): no in-card picker — every Book
 * opens the shared BookingModal on that offering. One offering: header,
 * description, an outlined "Book this session" and what happens next. Several:
 * the first two with Book on each, then "Compare sessions". Book is outlined:
 * the header's "Book a session" is the view's one filled button (CTA hierarchy).
 */
export function BookSessionCard({
  sessionTypes,
  onBook,
  onCompare,
  bookBlocked,
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
          {s.description && <p className={styles.desc}>{s.description}</p>}
          <Button
            variant="secondary-outlined"
            fullWidth
            disabled={!!bookBlocked}
            onClick={() => onBook(s.id)}
          >
            {bookBlocked ?? 'Book this session'}
          </Button>
          <p className={styles.helper}>You’ll pick a time and answer a few questions next.</p>
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
              <Button
                variant="secondary-outlined"
                disabled={!!bookBlocked}
                onClick={() => onBook(s.id)}
              >
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
