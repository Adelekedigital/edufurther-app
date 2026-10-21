import { cx } from '@/lib/utils/cx';
import styles from './IntegrationsScreen.module.css';

/**
 * Loading: the header, the recommended card and its alternative as grey
 * blocks, at the size they land (videoLayout=primary). The heights are
 * measured off the built page rather than rounded, so nothing jumps when the
 * setting arrives.
 */
export function IntegrationsSkeleton() {
  return (
    <div role="status" aria-label="Loading your integrations" className={styles.loading}>
      {/* A live region with no text may not be read out. */}
      <span className="sr-only">Loading your integrations</span>
      <div className={cx(styles.block, styles.blockHeading)} />
      <div className={styles.group}>
        <div className={cx(styles.block, styles.blockHero)} />
        <div className={cx(styles.block, styles.blockOther)} />
        <div className={cx(styles.block, styles.blockProvider)} />
      </div>
      {/* The Calendars group lands below, so the skeleton has to reach there too. */}
      <div className={cx(styles.block, styles.blockHeading)} />
      <div className={cx(styles.block, styles.blockRow)} />
    </div>
  );
}
