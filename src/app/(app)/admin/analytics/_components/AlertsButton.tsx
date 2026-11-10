'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
  /** Where focus goes if every alert clears while the count or its list has it. */
  fallbackFocus?: () => HTMLElement | null;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const gone = alerts.length === 0;

  // Set as the count leaves the page, if focus was on it or in its list.
  const leftWithFocus = useRef(false);
  const fallback = useRef(fallbackFocus);
  useEffect(() => {
    fallback.current = fallbackFocus;
  }, [fallbackFocus]);
  useEffect(() => {
    if (!gone || !leftWithFocus.current) return;
    leftWithFocus.current = false;
    // After the list's own cleanups, which hand focus to the count that just left.
    const t = setTimeout(() => {
      const now = document.activeElement;
      if (!now || now === document.body) fallback.current?.()?.focus({ preventScroll: true });
    });
    return () => clearTimeout(t);
  }, [gone]);

  // Every alert cleared while the list was open: it stays closed when the next one fires.
  if (gone && open) setOpen(false);
  if (gone) return null;
  return (
    <span className={styles.root} data-alerts={id}>
      <LeaveWatch id={id} onLeave={(had) => (leftWithFocus.current = had)} />
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
        <Popover title={ALERTS.heading} id={id} triggerRef={trigger} onClose={() => setOpen(false)}>
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

/**
 * Says, as the count leaves the page, whether focus was on it or in its list.
 * A layout cleanup runs before the nodes are removed, so it can ask where focus
 * is; a blur can't tell (Chrome fires one on removal, like any other leaving).
 * Found by attribute and id, not refs: React detaches those before this runs.
 */
function LeaveWatch({ id, onLeave }: { id: string; onLeave: (hadFocus: boolean) => void }) {
  const report = useRef(onLeave);
  useLayoutEffect(() => {
    report.current = onLeave;
  });
  useLayoutEffect(() => {
    report.current(false);
    return () => {
      const now = document.activeElement;
      // The phone sheet is portalled out of the count's box: found by its id.
      const inside =
        !!now &&
        (!!now.closest(`[data-alerts="${id}"]`) || !!document.getElementById(id)?.contains(now));
      report.current(inside);
    };
  }, [id]);
  return null;
}
