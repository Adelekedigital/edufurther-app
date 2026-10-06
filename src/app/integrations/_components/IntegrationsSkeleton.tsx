import { cx } from '@/lib/utils/cx';
import styles from './IntegrationsScreen.module.css';

/** Loading: the header and the two provider cards as grey blocks, at the size they land. */
export function IntegrationsSkeleton() {
  return (
    <div role="status" aria-label="Loading your integrations" className={styles.loading}>
      {/* A live region with no text may not be read out. */}
      <span className="sr-only">Loading your integrations</span>
      <div className={cx(styles.block, styles.blockHeading)} />
      <div className={styles.grid}>
        <div className={cx(styles.block, styles.blockCard)} />
        <div className={cx(styles.block, styles.blockCard)} />
      </div>
    </div>
  );
}
