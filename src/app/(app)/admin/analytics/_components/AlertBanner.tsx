import { Icon } from '@/components/atoms/Icon/Icon';
import type { AnalyticsAlert } from '@/lib/api/data/adminAnalytics';
import { alertLinkLabel } from '@/lib/copy/adminAnalytics';
import styles from './AlertBanner.module.css';

/**
 * A PRD 30 alert that is firing (Admin Analytics.dc.html `hasAlert`): red, on
 * every tab, "{Title}: {what happened}" and a link to the view that explains
 * it. The words are the server's, shown as text.
 */
export function AlertBanner({
  alert,
  onOpen,
}: {
  alert: AnalyticsAlert;
  onOpen: (link: NonNullable<AnalyticsAlert['link']>) => void;
}) {
  const { link } = alert;
  return (
    <div role="alert" className={styles.banner}>
      <Icon name="error" size={20} />
      <span className={styles.text}>
        <strong className={styles.title}>{alert.title}:</strong> {alert.body}
      </span>
      {link && (
        <button type="button" className={styles.link} onClick={() => onOpen(link)}>
          {alertLinkLabel(link.tab)}
        </button>
      )}
    </div>
  );
}
