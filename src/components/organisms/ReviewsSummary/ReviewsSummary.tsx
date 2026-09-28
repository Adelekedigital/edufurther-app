import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { RatingBar } from '@/components/atoms/RatingBar/RatingBar';
import { Star } from '@/components/atoms/Star/Star';
import { Tag } from '@/components/atoms/Tag/Tag';
import { formatRating } from '@/lib/utils/format';
import type { ReviewAttribute, ReviewSummary } from '@/types/mentor';
import styles from './ReviewsSummary.module.css';

/** The design's order: the bars list them this way, and ties keep it. */
const ATTRIBUTES: { key: ReviewAttribute; label: string; icon: IconName }[] = [
  { key: 'communication', label: 'Communication', icon: 'chat' },
  { key: 'knowledge', label: 'Knowledge', icon: 'psychology' },
  { key: 'support', label: 'Support', icon: 'handshake' },
  { key: 'practicality', label: 'Practicality', icon: 'task_alt' },
];

type ReviewsSummaryProps = {
  summary: ReviewSummary;
  firstName: string;
};

/**
 * Mentor Profile.dc.html, top of the Reviews tab: the average, "{n} in 10
 * mentees would recommend", the two most praised attributes and a bar for each.
 * Parts with no data yet are left out rather than shown empty.
 */
export function ReviewsSummary({ summary: s, firstName }: ReviewsSummaryProps) {
  const rated = ATTRIBUTES.flatMap((a) => {
    const percent = s.attributes[a.key];
    return percent === null ? [] : [{ ...a, percent }];
  });
  const praised = [...rated].sort((a, b) => b.percent - a.percent).slice(0, 2);
  const filled = s.rating === null ? 0 : Math.round(s.rating);

  return (
    <section className={styles.card} aria-labelledby="reviews-summary">
      <h2 id="reviews-summary" className="sr-only">
        Rating summary
      </h2>
      <div className={styles.score}>
        {s.rating !== null && (
          <>
            <span className={styles.rating}>{formatRating(s.rating)}</span>
            <span
              className={styles.stars}
              role="img"
              aria-label={`${formatRating(s.rating)} out of 5`}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={16} className={i <= filled ? styles.star : styles.starOff} />
              ))}
            </span>
          </>
        )}
        <span className={styles.count}>
          from {s.count} verified {s.count === 1 ? 'review' : 'reviews'}
        </span>
      </div>
      <div className={styles.detail}>
        {s.wouldRecommendIn10 !== null && (
          <p className={styles.recommend}>
            <span className={styles.in10}>{s.wouldRecommendIn10} in 10</span>
            <span className={styles.recommendText}>
              mentees would recommend {firstName} to a friend
            </span>
          </p>
        )}
        {praised.length > 0 && (
          <div className={styles.praised}>
            <span className={styles.praisedLabel}>Most praised for</span>
            {praised.map((a) => (
              <Tag key={a.key} tone="praise">
                <Icon name={a.icon} size={16} />
                {a.label} {a.percent}%
              </Tag>
            ))}
          </div>
        )}
        {rated.length > 0 && (
          <div className={styles.bars}>
            {rated.map((a) => (
              <RatingBar key={a.key} label={a.label} percent={a.percent} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
