import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import styles from './FeaturedMentor.module.css';

/** Holds the featured card's space while it loads, so the page below doesn't jump. */
export function FeaturedMentorSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden>
      <span className={styles.skeletonPhoto} />
      <div className={styles.body}>
        <Skeleton width="45%" height="20px" />
        <Skeleton width="60%" height="12px" />
        <Skeleton width="35%" height="12px" />
        <Skeleton width="90%" height="32px" />
        <Skeleton width="40%" height="12px" />
        <Skeleton width="220px" height="var(--button-cta-h)" radius="md" />
      </div>
    </div>
  );
}
