import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Tag } from '@/components/atoms/Tag/Tag';
import type { ProfileSessionType } from '@/types/mentor';
import styles from './SessionTypeList.module.css';

type SessionTypeListProps = {
  sessionTypes: ProfileSessionType[];
  onBook: (sessionTypeId: string) => void;
  /** Why booking can't start (offline, account not ready), or null. */
  bookBlocked: string | null;
  /** The owner sees their offerings without Book buttons. */
  canBook: boolean;
  /** Drawn, but can't be used (the owner's "View as mentee"). */
  bookDisabled?: boolean;
};

/**
 * The Sessions tab (Mentor Profile.dc.html): one card per offering. The
 * design's per-offering "Free Mon, Sep 28" line is not shown: availability is
 * stored per mentor, not per offering (backend reply #10).
 */
export function SessionTypeList({
  sessionTypes,
  onBook,
  bookBlocked,
  canBook,
  bookDisabled = false,
}: SessionTypeListProps) {
  return (
    <ul className={styles.grid}>
      {sessionTypes.map((s) => (
        <li key={s.id} className={styles.card}>
          <div className={styles.top}>
            {s.category ? <Tag tone="info">{s.category}</Tag> : <span />}
            <span className={styles.price}>Free</span>
          </div>
          <h3 className={styles.name}>{s.name}</h3>
          {s.description && <p className={styles.desc}>{s.description}</p>}
          <div className={styles.chips}>
            <span className={styles.chip}>
              <Icon name="schedule" size={14} />
              {s.durationMin} min
            </span>
            {s.stage && (
              <span className={styles.chip}>
                <Icon name="flag" size={14} />
                {s.stage}
              </span>
            )}
          </div>
          {canBook && (
            <div className={styles.foot}>
              {/* Repeated on every card, so outlined (CTA hierarchy). */}
              <Button
                variant="secondary-outlined"
                disabled={!!bookBlocked || bookDisabled}
                onClick={() => onBook(s.id)}
              >
                {bookBlocked ?? 'Book session'}
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
