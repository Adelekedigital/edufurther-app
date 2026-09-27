import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import styles from './MentorCardSkeleton.module.css';

/** First-load placeholder, the same shape as MentorCard so nothing jumps. */
export function MentorCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden>
      <Skeleton aspectRatio="445 / 300" radius="lg" />
      <Skeleton width="60%" height="16px" />
      <Skeleton width="80%" height="12px" />
      <Skeleton width="45%" height="12px" />
      <Skeleton height="var(--button-cta-h)" radius="md" />
    </div>
  );
}
