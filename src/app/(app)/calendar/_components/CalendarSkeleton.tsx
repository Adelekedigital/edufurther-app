import { cx } from '@/lib/utils/cx';
import styles from './CalendarScreen.module.css';

/** Calendar v2 scene Loading: the settings row and both cards as grey blocks, under the page header. */
export function CalendarSkeleton() {
  return (
    <div role="status" aria-label="Loading your calendar" className={styles.loading}>
      {/* A live region with no text may not be read out. */}
      <span className="sr-only">Loading your calendar</span>
      <div className={cx(styles.block, styles.blockSettings)} />
      <div className={styles.columns}>
        <div className={cx(styles.block, styles.blockHours)} />
        <div className={cx(styles.block, styles.blockMonth)} />
      </div>
    </div>
  );
}
