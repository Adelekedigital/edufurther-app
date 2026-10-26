import { ShareMenu } from '@/components/molecules/ShareMenu/ShareMenu';
import styles from './DashboardHeader.module.css';

type DashboardHeaderProps = {
  /** First name for the greeting. */
  name: string;
  /** The one-line context under the greeting. */
  subline: string;
  /** Absolute profile URL for the share menu. Empty hides the share button. */
  shareUrl: string;
  /** Mentor's name, for the share email subject. */
  shareName: string;
  /** The share menu's link copy landed. */
  onShareCopied?: () => void;
};

/**
 * Mentor Dashboard v2 header: greeting + subline, with a "Share profile" button
 * that opens the shared ShareMenu (its labelled-trigger variant).
 */
export function DashboardHeader({
  name,
  subline,
  shareUrl,
  shareName,
  onShareCopied,
}: DashboardHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>Welcome back, {name}</h1>
        <p className={styles.subline}>{subline}</p>
      </div>
      {shareUrl && (
        <ShareMenu
          triggerLabel="Share profile"
          url={shareUrl}
          name={shareName}
          onCopied={onShareCopied}
        />
      )}
    </div>
  );
}
