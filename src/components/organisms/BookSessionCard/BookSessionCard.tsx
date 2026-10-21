import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Tag } from '@/components/atoms/Tag/Tag';
import { BookingModeLabel } from '@/components/molecules/BookingModeLabel/BookingModeLabel';
import { zoneLabel } from '@/components/molecules/TimezonePicker/TimezonePicker';
import { bookSessionsSub } from '@/lib/copy/profile';
import type { ProfileSessionType } from '@/types/mentor';
import styles from './BookSessionCard.module.css';

type BookSessionCardProps = {
  sessionTypes: ProfileSessionType[];
  /** The zone the booking times show in, named in the subtitle. */
  timeZone: string;
  /** Opens the shared booking modal, on that offering when one is given. */
  onBook: (sessionTypeId?: string) => void;
  /** Opens the Sessions tab; without one (under 3 sessions) there's no link. */
  onCompare?: () => void;
  bookBlocked: string | null;
  /** Drawn, but can't be used (the owner's "View as mentee"). */
  bookDisabled?: boolean;
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
  timeZone,
  onBook,
  onCompare,
  bookBlocked,
  bookDisabled = false,
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
                <BookingModeLabel requiresConfirmation={s.requiresConfirmation !== false} />
              </span>
            </div>
            <Tag tone="free">Free</Tag>
          </div>
          {s.description && <p className={styles.desc}>{s.description}</p>}
          <Button
            variant="secondary-outlined"
            fullWidth
            disabled={!!bookBlocked || bookDisabled}
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
        <span className={styles.sub}>
          {bookSessionsSub(sessionTypes.length, zoneLabel(timeZone))}
        </span>
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
              <span className={styles.rowMeta}>
                <span className={styles.metaItem}>
                  <Icon name="schedule" size={14} />
                  {s.durationMin} min
                </span>
                <BookingModeLabel requiresConfirmation={s.requiresConfirmation !== false} />
              </span>
              <Button
                variant="secondary-outlined"
                disabled={!!bookBlocked || bookDisabled}
                onClick={() => onBook(s.id)}
              >
                Book
                <span className="sr-only"> {s.name}</span>
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {onCompare && (
        <button type="button" className={styles.compare} onClick={onCompare}>
          {sessionTypes.length > 2 ? `See all ${sessionTypes.length} sessions` : 'Compare sessions'}
          <Icon name="arrow_forward" size={16} />
        </button>
      )}
    </section>
  );
}
