'use client';

import { useId, useRef, useState } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Popover } from '@/components/templates/Popover/Popover';
import type { AnalyticsAlert } from '@/lib/api/data/adminAnalytics';
import { ALERTS, alertLinkLabel } from '@/lib/copy/adminAnalytics';
import styles from './AlertsButton.module.css';

type Link = NonNullable<AnalyticsAlert['link']>;

/**
 * The alerts firing now (Admin Analytics.dc.html, owner 10 Nov): a red count
 * beside the title, nothing with none. It opens the list, newest first; each
 * link opens the view that explains it and closes the list.
 */
export function AlertsButton({
  alerts,
  onOpen,
  fallbackFocus,
}: {
  alerts: AnalyticsAlert[];
  onOpen: (link: Link) => void;
  /** Where focus goes if every alert clears while the list has it. */
  fallbackFocus?: () => HTMLElement | null;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  // Every alert cleared while the list was open: it stays closed when the next one fires.
  if (alerts.length === 0 && open) setOpen(false);
  if (alerts.length === 0) return null;
  return (
    <span className={styles.root}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-label={ALERTS.count(alerts.length)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="error" size={18} />
        <span aria-hidden>{alerts.length}</span>
      </button>
      {open && (
        <Popover
          title={ALERTS.heading}
          id={id}
          triggerRef={trigger}
          onClose={() => setOpen(false)}
          fallbackFocus={fallbackFocus}
        >
          <ul className={styles.list}>
            {alerts.map((a) => (
              <li key={a.key} className={styles.item}>
                <Icon name="error" size={20} className={styles.icon} />
                <div className={styles.text}>
                  <strong className={styles.title}>{a.title}</strong>
                  <span className={styles.body}>{a.body}</span>
                  {a.link && (
                    <button
                      type="button"
                      className={styles.link}
                      onClick={() => {
                        setOpen(false);
                        onOpen(a.link!);
                      }}
                    >
                      {alertLinkLabel(a.link)}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Popover>
      )}
    </span>
  );
}
