'use client';

import { useState } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { ShareProfileModal } from '@/components/templates/ShareProfileModal/ShareProfileModal';
import styles from './DashboardHeader.module.css';

type DashboardHeaderProps = {
  /** First name for the greeting. */
  name: string;
  /** The one-line context under the greeting. */
  subline: string;
  /** Absolute profile URL to share. Empty hides the share button. */
  shareUrl: string;
  /** Mentor's name, for the share message. */
  shareName: string;
  /** The profile link was copied or shared. */
  onShareCopied?: () => void;
};

/**
 * Mentor Dashboard v2 header: greeting + subline, with a "Share profile" button
 * that opens the shared ShareProfileModal (a bottom sheet on phones).
 */
export function DashboardHeader({
  name,
  subline,
  shareUrl,
  shareName,
  onShareCopied,
}: DashboardHeaderProps) {
  const [sharing, setSharing] = useState(false);
  return (
    <div className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>Welcome back, {name}</h1>
        <p className={styles.subline}>{subline}</p>
      </div>
      {shareUrl && (
        <Button
          variant="secondary-outlined"
          size="small"
          aria-haspopup="dialog"
          onClick={() => setSharing(true)}
        >
          Share profile
        </Button>
      )}
      {sharing && shareUrl && (
        <ShareProfileModal
          url={shareUrl}
          name={shareName}
          own
          onShared={onShareCopied}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}
