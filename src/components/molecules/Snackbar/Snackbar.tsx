'use client';

import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
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
  action,
  tone,
}: {
  message: string | null;
  /** Moves with each outcome, so the same words twice are shown and heard again. */
  stamp?: number;
  /**
   * One action beside the message, such as Undo (Mentee Dashboard v2.dc.html).
   * `focus`: it takes focus when it shows, for an outcome that removed the
   * control the person was on (Hide), so they land on the way back.
   */
  action?: { label: string; onClick: () => void; focus?: boolean };
  /**
   * An outcome with its glyph (Admin.dc.html toast): success, a green
   * check_circle; error, a red error. Absent: the plain toast.
   */
  tone?: 'success' | 'error';
}) {
  const actionRef = useRef<HTMLButtonElement>(null);
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
  const focusAction = !!shown && !!action?.focus;
  useEffect(() => {
    if (focusAction) actionRef.current?.focus();
  }, [focusAction, stamp]);
  const region = (
    <div role="status" className={styles.region}>
      {shown && (
        <div
          key={stamp}
          className={cx(styles.toast, action && styles.withAction, tone && styles.withIcon)}
        >
          {tone && (
            <Icon
              name={tone === 'success' ? 'check_circle' : 'error'}
              size={20}
              className={tone === 'success' ? styles.success : styles.error}
            />
          )}
          {shown}
          {action && (
            <button
              ref={actionRef}
              type="button"
              className={styles.action}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
  return client ? createPortal(region, document.body) : region;
}
