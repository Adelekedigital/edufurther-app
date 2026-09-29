import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { Button } from '@/components/atoms/Button/Button';
import { Star } from '@/components/atoms/Star/Star';
import { Tag } from '@/components/atoms/Tag/Tag';
import { cx } from '@/lib/utils/cx';
import type { Review } from '@/types/mentor';
import styles from './ReviewItem.module.css';

type ReviewItemProps = {
  review: Review;
  /** Guests: three grey lines in place of the text (Mentor Profile.dc.html `redacted`). */
  redacted?: boolean;
  /** The viewer's own review: a "Your review" tag (`r.isMine`). */
  mine?: boolean;
  /** Still editable: "Editable until 4:32 pm" + Edit, under the text (`r.canEdit`). */
  edit?: { until: string; onEdit: () => void };
};

const DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Mentor Profile.dc.html: one review in the Reviews tab. */
export function ReviewItem({ review: r, redacted = false, mine = false, edit }: ReviewItemProps) {
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
      {(r.topic || mine) && (
        // The design's tag row: the session's topic, and "Your review".
        <div className={styles.tags}>
          {r.topic && <Tag tone="neutral">{r.topic}</Tag>}
          {mine && <Tag tone="mine">Your review</Tag>}
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
      {edit && (
        <div className={styles.editRow}>
          <span>Editable until {edit.until}</span>
          <Button variant="text" size="medium" className={styles.editButton} onClick={edit.onEdit}>
            Edit<span className="sr-only"> your review</span>
          </Button>
        </div>
      )}
    </article>
  );
}
