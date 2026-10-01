import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import styles from './CalendarScreen.module.css';

/** Ours (calendar design request #1): the page's frame while hours and settings load. */
export function CalendarSkeleton() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.intro}>
          <h1 className={styles.title}>Your calendar</h1>
          <Skeleton width="320px" height="16px" />
        </div>
      </header>
      <p className="sr-only" role="status">
        Loading your calendar
      </p>
      <div className={styles.settings}>
        <div className={styles.skeletonRow}>
          <Skeleton width="32px" height="32px" radius="md" />
          <div className={styles.skeletonLines}>
            <Skeleton width="140px" height="16px" />
            <Skeleton width="70%" height="14px" />
          </div>
        </div>
      </div>
      <div className={styles.columns}>
        <div className={`${styles.hoursCard} ${styles.skeletonCard}`}>
          <Skeleton width="120px" height="20px" />
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <Skeleton width="36px" height="20px" radius="lg" />
              <Skeleton width="80px" height="14px" />
              <Skeleton width="45%" height="37px" radius="md" />
            </div>
          ))}
        </div>
        <div className={`${styles.monthCard} ${styles.skeletonCard}`}>
          <Skeleton width="140px" height="20px" />
          <Skeleton height="260px" radius="lg" />
        </div>
      </div>
    </>
  );
}
