'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import styles from './Snackbar.module.css';

const noop = () => () => {};

/**
 * A short outcome at the bottom of the screen (Mentee Settings.dc.html
 * `hasToast`): "Profile saved". The status region is always in the page and
 * the message is put inside it, so it is read out. It renders into <body>:
 * a save from a kept tab panel (Save and continue to another tab) is still
 * seen and heard once that panel is hidden.
 */
export function Snackbar({
  message,
  stamp = 0,
}: {
  message: string | null;
  /** Moves with each outcome, so the same words twice are shown and heard again. */
  stamp?: number;
}) {
  // The server render has no <body> to portal into; the client's first pass agrees.
  // The whole region moves, empty, before any message can arrive.
  const client = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const region = (
    <div role="status" className={styles.region}>
      {message && (
        <div key={stamp} className={styles.toast}>
          {message}
        </div>
      )}
    </div>
  );
  return client ? createPortal(region, document.body) : region;
}
