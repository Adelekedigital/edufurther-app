'use client';

import { useEffect, useId, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import styles from './Snackbar.module.css';

const noop = () => () => {};

// The one toast on screen: the newest outcome from any Snackbar wins, so two
// kept tab panels never stack their toasts in the same spot.
let owner: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const setOwner = (id: string | null) => {
  owner = id;
  listeners.forEach((l) => l());
};

/**
 * A short outcome at the bottom of the screen (Mentee Settings.dc.html
 * `hasToast`): "Profile saved". The status region is always in the page and
 * the message is put inside it, so it is read out. It renders into <body>:
 * a save from a kept tab panel (Save and continue to another tab) is still
 * seen and heard once that panel is hidden. Only the newest toast shows.
 */
export function Snackbar({
  message,
  stamp = 0,
}: {
  message: string | null;
  /** Moves with each outcome, so the same words twice are shown and heard again. */
  stamp?: number;
}) {
  const id = useId();
  // The server render has no <body> to portal into; the client's first pass agrees.
  // The whole region moves, empty, before any message can arrive.
  const client = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const current = useSyncExternalStore(
    subscribe,
    () => owner,
    () => null,
  );
  // A new outcome takes the screen; gone or cleared, it gives it back.
  useEffect(() => {
    if (!message) return;
    setOwner(id);
    return () => {
      if (owner === id) setOwner(null);
    };
  }, [message, stamp, id]);
  const shown = message && current === id ? message : null;
  const region = (
    <div role="status" className={styles.region}>
      {shown && (
        <div key={stamp} className={styles.toast}>
          {shown}
        </div>
      )}
    </div>
  );
  return client ? createPortal(region, document.body) : region;
}
