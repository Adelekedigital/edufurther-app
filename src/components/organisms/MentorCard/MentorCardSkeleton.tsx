import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { cx } from '@/lib/utils/cx';
import styles from './MentorCardSkeleton.module.css';

/** First-load placeholder, the same shape as MentorCard so nothing jumps. */
export function MentorCardSkeleton({ variant = 'photo' }: { variant?: 'photo' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className={cx(styles.card, styles.compact)} aria-hidden>
        <div className={styles.head}>
          <span className={styles.circle} />
          <div className={styles.lines}>
            <Skeleton width="60%" height="16px" />
            <Skeleton width="85%" height="12px" />
            <Skeleton width="45%" height="12px" />
          </div>
        </div>
        <Skeleton width="55%" height="12px" />
        <Skeleton height="var(--button-h-medium)" radius="md" />
      </div>
    );
  }
  return (
    <div className={styles.card} aria-hidden>
      <Skeleton aspectRatio="445 / 300" radius="lg" />
      <Skeleton width="60%" height="16px" />
      <Skeleton width="80%" height="12px" />
      <Skeleton width="45%" height="12px" />
      <Skeleton height="var(--button-h-medium)" radius="md" />
    </div>
  );
}
