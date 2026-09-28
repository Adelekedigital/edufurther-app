import { Icon } from '@/components/atoms/Icon/Icon';
import { formatRating, movedBetween, sessionsLabel } from '@/lib/utils/format';
import styles from './MentorProof.module.css';

type MentorProofProps = {
  rating: number | null;
  reviewCount: number;
  completedSessions: number;
  originCountry?: string | null;
  studyCountry?: string | null;
};

/**
 * The trust line under a mentor's name. Never shows an empty star rating.
 *   reviews         → ★ 4.9 (11 reviews) · 23 sessions
 *   0–2 sessions    → New mentor · Moved from Nigeria to the United States
 *                     (or · 2 sessions when the move isn't known)   (MentorCard.dc.html)
 *   3+, no reviews  → No reviews yet · 12 sessions        (backend reply #6)
 * The design's award variant ("New mentor · {award}") needs awards on the
 * list API, which it doesn't have.
 */
export function MentorProof({
  rating,
  reviewCount,
  completedSessions,
  originCountry,
  studyCountry,
}: MentorProofProps) {
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
          <strong className={styles.strong}>New mentor</strong> ·{' '}
          {(() => {
            const move = movedBetween(originCountry, studyCountry);
            return move
              ? `Moved from ${move.from} to ${move.to}`
              : sessionsLabel(completedSessions);
          })()}
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
