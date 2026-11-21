'use client';

import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { BottomSheet } from '@/components/templates/BottomSheet/BottomSheet';
import { INSTALL_COPY } from '@/lib/copy/install';
import styles from './InstallSheet.module.css';

type InstallSheetProps = {
  /** android: the browser's prompt behind "Install the app". ios: Safari's Share steps. */
  platform: 'android' | 'ios';
  /** The line under the title, worded for what just happened. */
  lead: string;
  /** Android's "Install the app". */
  onAccept: () => void;
  /** The close button, Escape or the backdrop: the dismiss. */
  onClose: () => void;
};

const C = INSTALL_COPY;

/**
 * The install nudge (design boards Main / IphoneSheet, copy from the owner's
 * brief): the shared phone BottomSheet, the app's own icon beside the title,
 * then why and "Install the app" (Android) or the Share steps (iPhone).
 * The sheet's own close is the only way to say no (owner, 2026-11-18).
 * Presentational: when it shows and what it does are InstallNudgeRoot's.
 */
export function InstallSheet({ platform, lead, onAccept, onClose }: InstallSheetProps) {
  return (
    <BottomSheet
      title={C.title}
      icon={
        // The real home-screen icon, drawn at 32 from its 192px rendition.
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/pwa-icon/192" alt="" width={32} height={32} className={styles.mark} />
      }
      onClose={onClose}
    >
      <div className={styles.text}>
        <p className={styles.lead}>{lead}</p>
        {platform === 'android' && <p className={styles.reason}>{C.reason}</p>}
      </div>
      {platform === 'ios' && (
        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.num} aria-hidden>
              1
            </span>
            <span>
              {C.steps.shareBefore} <strong>{C.steps.share}</strong>{' '}
              <Icon name="ios_share" size={18} className={styles.share} /> {C.steps.shareAfter}
            </span>
          </li>
          <li className={styles.step}>
            <span className={styles.num} aria-hidden>
              2
            </span>
            <span>
              {C.steps.choose} <strong>{C.steps.addToHome}</strong>
            </span>
          </li>
          <li className={styles.step}>
            <span className={styles.num} aria-hidden>
              3
            </span>
            <span>{C.steps.open}</span>
          </li>
        </ol>
      )}
      {platform === 'android' && (
        <Button size="large" fullWidth onClick={onAccept}>
          {C.add}
        </Button>
      )}
    </BottomSheet>
  );
}
