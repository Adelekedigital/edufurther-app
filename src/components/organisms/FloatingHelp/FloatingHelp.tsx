'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import styles from './FloatingHelp.module.css';

type FloatingHelpProps = {
  /** Whether the nudge is shown at all (e.g. gate on a configured URL). */
  show: boolean;
  title: string;
  /** The pill's action label. */
  label: string;
  /** The sheet's action label; defaults to `label`. */
  sheetLabel?: string;
  body: string;
  icon?: IconName;
  /** The action opens an external page in a new tab (trail icon → open_in_new). */
  external?: boolean;
  onAction: () => void;
  /** Force the mobile treatment; defaults to a media-query check. */
  mobile?: boolean;
};

// Resting distance from the bottom: above a mobile bottom-nav, or a desktop gutter.
// A consumer that puts content behind the pill reserves matching bottom clearance
// (see MenteeHomeScreen.module.css `.page[data-help]`); keep the two in sync.
const MOBILE_BASE = 72;
const DESKTOP_BASE = 24; // var(--space-6)
const PHONE = '(max-width: 767px)';

/**
 * A fixed bottom-right help nudge (FloatingHelp.dc.html). Shared so the mentee
 * home ("Talk to us") and other screens use one element. It sits still — it does
 * NOT reposition on scroll (the design's scroll-driven lift read as "dancing"
 * and pulled attention on this short page, product 2026-10-15) — and can be
 * dismissed to an icon, which on a phone opens a small sheet.
 */
export function FloatingHelp({
  show,
  title,
  label,
  sheetLabel,
  body,
  icon = 'support_agent',
  external = false,
  onAction,
  mobile,
}: FloatingHelpProps) {
  const [dismissed, setDismissed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const sheetId = useId();
  const miniRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const focusSkip = useRef(true);

  // The app detects phones by media query (it never sets the dc.html's
  // `data-ef-mobile`); `mobile` is a test/override.
  const isPhone = useMediaQuery(PHONE);
  const mob = mobile ?? isPhone;

  // Escape closes the sheet and returns focus to the icon that opened it.
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSheet(false);
      miniRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  // Dismiss/restore swaps which control is mounted; move focus to its replacement
  // so a keyboard user isn't dropped to <body>. Skip the first run so focus is
  // never stolen on mount.
  useEffect(() => {
    if (focusSkip.current) {
      focusSkip.current = false;
      return;
    }
    if (dismissed) miniRef.current?.focus();
    else actionRef.current?.focus();
  }, [dismissed]);

  if (!show) return null;

  const base = mob ? MOBILE_BASE : DESKTOP_BASE;
  // + the safe-area so the pill clears a phone's bottom nav (tab bar is 56px +
  // env(safe-area-inset-bottom)); env() resolves to 0 on desktop, so the desktop
  // offset is unchanged.
  const pos = { right: 'var(--space-6)', bottom: `calc(${base}px + env(safe-area-inset-bottom))` };
  const trail: IconName = external ? 'open_in_new' : 'arrow_forward';

  const fire = () => {
    setSheet(false);
    onAction();
  };

  if (dismissed) {
    const miniLabel = mob ? title : `Show “${title}”`;
    return (
      <>
        <button
          type="button"
          ref={miniRef}
          className={styles.mini}
          style={pos}
          aria-label={miniLabel}
          aria-expanded={mob ? sheet : undefined}
          aria-controls={mob ? sheetId : undefined}
          title={miniLabel}
          onClick={() => (mob ? setSheet((s) => !s) : setDismissed(false))}
        >
          <Icon name={icon} size={24} />
        </button>
        {sheet && (
          <>
            <div
              className={styles.scrim}
              onClick={() => {
                setSheet(false);
                miniRef.current?.focus();
              }}
              aria-hidden="true"
            />
            <div
              id={sheetId}
              className={styles.sheet}
              style={{
                right: 'var(--space-6)',
                bottom: `calc(${base}px + var(--space-14) + env(safe-area-inset-bottom))`,
              }}
            >
              <span className={styles.sheetHead}>
                <Icon name={icon} size={18} className={styles.glyph} />
                {title}
              </span>
              <span className={styles.sheetBody}>{body}</span>
              <button type="button" className={styles.sheetAction} onClick={fire}>
                {sheetLabel ?? label}
                <Icon name={trail} size={16} className={styles.trail} />
              </button>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div role="complementary" aria-label={title} className={styles.pill} style={pos}>
      <span aria-hidden="true" className={styles.glyph}>
        <Icon name={icon} size={20} />
      </span>
      <span className={styles.title}>{title}</span>
      <button type="button" ref={actionRef} className={styles.action} onClick={fire}>
        {label}
        <Icon name={trail} size={16} className={styles.trail} />
      </button>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
