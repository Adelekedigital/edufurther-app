'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import styles from './FloatingHelp.module.css';

type FloatingHelpProps = {
  /** Whether the nudge is active at all (e.g. gate on a configured URL). */
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
  /** Selector; the pill shows only after this element has scrolled above the top. */
  startAfter?: string;
  /** Selector; the pill lifts to clear this element as it enters the viewport. */
  endAt?: string;
  /** Force the mobile treatment; defaults to a `body[data-ef-mobile]` check. */
  mobile?: boolean;
};

// Resting distance from the bottom: above a mobile bottom-nav, or a desktop gutter.
const MOBILE_BASE = 72;
const DESKTOP_BASE = 24; // var(--space-6)
const PHONE = '(max-width: 767px)';

/**
 * A fixed, scroll-aware help nudge (FloatingHelp.dc.html). Shared so the mentee
 * home ("Talk to us") and other screens use one element. It rests at the bottom,
 * lifts to clear `endAt` as the page ends, collapses to an icon when dismissed
 * (or on mobile near the end), and on mobile opens a small sheet.
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
  startAfter,
  endAt,
  mobile,
}: FloatingHelpProps) {
  const [passed, setPassed] = useState(!startAfter);
  const [nearEnd, setNearEnd] = useState(false);
  const [lift, setLift] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const rafRef = useRef(0);
  const sheetId = useId();
  const miniRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const focusSkip = useRef(true);

  // The app detects phones by media query (it never sets the dc.html's
  // `data-ef-mobile`); `mobile` is a test/override. useMediaQuery re-renders on
  // a breakpoint change, so the treatment stays correct across a resize.
  const isPhone = useMediaQuery(PHONE);
  const mob = mobile ?? isPhone;

  useEffect(() => {
    if (!show || typeof window === 'undefined') return;
    const check = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const base = mob ? MOBILE_BASE : DESKTOP_BASE;
        const startEl = startAfter ? document.querySelector(startAfter) : null;
        const isPassed = !startAfter || (!!startEl && startEl.getBoundingClientRect().bottom < 0);
        const endEl = endAt ? document.querySelector(endAt) : null;
        const endTop = endEl ? endEl.getBoundingClientRect().top : Infinity;
        const near = endTop < window.innerHeight - base + 8;
        setPassed(isPassed);
        setNearEnd(near);
        setLift(near && endEl ? Math.max(base, Math.round(window.innerHeight - endTop + 12)) : base);
      });
    };
    window.addEventListener('scroll', check, { passive: true, capture: true });
    window.addEventListener('resize', check);
    check();
    const timers = [setTimeout(check, 300), setTimeout(check, 1000)];
    return () => {
      cancelAnimationFrame(rafRef.current);
      timers.forEach(clearTimeout);
      window.removeEventListener('scroll', check, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', check);
    };
  }, [show, startAfter, endAt, mob]);

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

  // Dismiss/restore swaps which control is mounted; move focus to its
  // replacement so a keyboard user isn't dropped to <body>. Skip the first run
  // so focus is never stolen on mount.
  useEffect(() => {
    if (focusSkip.current) {
      focusSkip.current = false;
      return;
    }
    if (dismissed) miniRef.current?.focus();
    else actionRef.current?.focus();
  }, [dismissed]);

  if (!show || !passed) return null;

  // Collapse to the icon only on an explicit dismiss — never from scroll state.
  // A scroll-driven full↔mini swap would drop keyboard focus and could re-pop the
  // sheet on its own; near the end the full pill just lifts (below) to clear the
  // content, so the collapse isn't needed for space (design-divergence.md).
  const mini = dismissed;
  const corner = mini || nearEnd;
  const base = mob ? MOBILE_BASE : DESKTOP_BASE;
  // Lift via transform, not `bottom`: a scroll-driven `bottom` change counts as
  // layout shift (CLS); transforms don't. The box stays at `base`; it only moves.
  const liftBy = nearEnd && lift ? Math.max(0, lift - base) : 0;
  const trail: IconName = external ? 'open_in_new' : 'arrow_forward';
  const cornerPos = {
    right: 'var(--space-6)',
    bottom: `${base}px`,
    transform: liftBy ? `translateY(-${liftBy}px)` : undefined,
  };
  const centerPos = {
    left: '50%',
    bottom: `${base}px`,
    transform: `translateX(-50%)${liftBy ? ` translateY(-${liftBy}px)` : ''}`,
  };

  const fire = () => {
    setSheet(false);
    onAction();
  };

  if (mini) {
    const miniLabel = dismissed && !mob ? `Show “${title}”` : title;
    return (
      <>
        <button
          type="button"
          ref={miniRef}
          className={styles.mini}
          style={cornerPos}
          aria-label={miniLabel}
          aria-expanded={mob ? sheet : undefined}
          aria-controls={mob ? sheetId : undefined}
          title={miniLabel}
          onClick={() => (dismissed && !mob ? setDismissed(false) : setSheet((s) => !s))}
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
                bottom: `calc(${base}px + var(--space-14))`,
                transform: liftBy ? `translateY(-${liftBy}px)` : undefined,
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
    <div
      role="complementary"
      aria-label={title}
      className={styles.pill}
      style={corner ? cornerPos : centerPos}
    >
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
