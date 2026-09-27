import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './OfflineBanner.module.css';

/** The app-wide offline strip at the top of AppShell (design PWA pass). */
export function OfflineBanner() {
  return (
    <div role="status" className={styles.banner}>
      <Icon name="cloud_off" size={16} />
      You’re offline. Showing what was last loaded; changes will sync when you’re back.
    </div>
  );
}
