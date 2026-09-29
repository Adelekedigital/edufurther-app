import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Star } from '@/components/atoms/Star/Star';
import { Tag } from '@/components/atoms/Tag/Tag';
import { cx } from '@/lib/utils/cx';
import type { Review } from '@/types/mentor';
import styles from './ReviewItem.module.css';

type ReviewItemProps = {
  review: Review;
  /** Guests: three grey lines in place of the text (Mentor Profile.dc.html `redacted`). */
  redacted?: boolean;
};

const DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Mentor Profile.dc.html: one review in the Reviews tab. */
export function ReviewItem({ review: r, redacted = false }: ReviewItemProps) {
  return (
    <article className={styles.item}>
      <div className={styles.head}>
        <Avatar size="md" tone="plain" initials={r.initials} alt="" />
        <div className={styles.who}>
          <span className={styles.name}>{r.author}</span>
          {r.institution && <span className={styles.meta}>{r.institution}</span>}
        </div>
        <div className={styles.side}>
          <span className={styles.stars} role="img" aria-label={`Rated ${r.rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={12} className={cx(styles.star, i > r.rating && styles.off)} />
            ))}
          </span>
          <time className={styles.meta} dateTime={r.createdAt}>
            {DATE.format(new Date(r.createdAt))}
          </time>
        </div>
      </div>
      {r.topic && (
        // The design's tag row (it also carries "Editable until…" on your own review).
        <div className={styles.tags}>
          <Tag tone="neutral">{r.topic}</Tag>
        </div>
      )}
      {redacted ? (
        <div
          className={styles.redacted}
          role="img"
          aria-label="Review text hidden. Sign up to read it."
        >
          <span className={styles.line} style={{ width: '92%' }} />
          <span className={styles.line} style={{ width: '78%' }} />
          <span className={styles.line} style={{ width: '54%' }} />
        </div>
      ) : (
        <p className={styles.text}>{r.text}</p>
      )}
    </article>
  );
}
