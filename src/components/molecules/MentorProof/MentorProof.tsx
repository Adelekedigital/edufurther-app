import { Icon } from '@/components/atoms/Icon/Icon';
import { formatRating, sessionsLabel } from '@/lib/utils/format';
import styles from './MentorProof.module.css';

type MentorProofProps = {
  rating: number | null;
  reviewCount: number;
  completedSessions: number;
};

/**
 * The trust line under a mentor's name. Never shows an empty star rating.
 *   reviews         → ★ 4.9 (11 reviews) · 23 sessions
 *   0–2 sessions    → New to EduFurther · 2 sessions      (design)
 *   3+, no reviews  → No reviews yet · 12 sessions        (backend reply #6)
 */
export function MentorProof({ rating, reviewCount, completedSessions }: MentorProofProps) {
  if (reviewCount > 0 && rating !== null) {
    return (
      <span className={styles.line}>
        <Icon name="star" size={14} filled className={styles.star} />
        <strong className={styles.strong}>{formatRating(rating)}</strong>
        <span>
          ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}) ·{' '}
          {sessionsLabel(completedSessions)}
        </span>
      </span>
    );
  }
  if (completedSessions <= 2) {
    return (
      <span className={styles.line}>
        <Icon name="new_releases" size={14} className={styles.new} />
        <span>
          <strong className={styles.strong}>New to EduFurther</strong> ·{' '}
          {sessionsLabel(completedSessions)}
        </span>
      </span>
    );
  }
  return (
    <span className={styles.line}>
      <span>
        <strong className={styles.strong}>No reviews yet</strong> ·{' '}
        {sessionsLabel(completedSessions)}
      </span>
    </span>
  );
}
