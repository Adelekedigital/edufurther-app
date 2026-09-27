import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import styles from './FeaturedMentor.module.css';

/** Holds the featured card's space while it loads, so the page below doesn't jump. */
export function FeaturedMentorSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden>
      <span className={styles.skeletonPhoto} />
      {/* Mirrors the card's groups: who, proof, bio, offer/availability, CTA. */}
      <div className={styles.body}>
        <div className={styles.who}>
          <Skeleton width="45%" height="26px" />
          <Skeleton width="60%" height="17px" />
        </div>
        <Skeleton width="35%" height="17px" />
        <Skeleton width="90%" height="35px" />
        <div className={styles.meta}>
          <Skeleton width="40%" height="17px" />
          <Skeleton width="45%" height="17px" />
        </div>
        <Skeleton width="220px" height="var(--button-cta-h)" radius="md" />
      </div>
    </div>
  );
}
