'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './MatchPill.module.css';

type MatchPillProps = {
  href: string;
  /** Off-platform link: opens in a new tab and says so. */
  external?: boolean;
  /** full pill, or the 48px round route icon. */
  size: 'full' | 'mini';
  /** centre of the viewport, or docked to the bottom-right corner. */
  dock: 'center' | 'corner';
  /** Distance from the bottom of the viewport, as a CSS length. */
  bottom: string;
  /**
   * What the round icon does. restore: bring back the full pill (desktop, after ×).
   * popover: open a small explainer above it (phones) — Design decisions: "Mobile
   * float icon: small popover".
   */
  miniAction: 'restore' | 'popover';
  /** One-line explainer shown in the popover. */
  body: string;
  /** Following the pager as it scrolls: position updates every frame, so no bottom transition. */
  tracking?: boolean;
  onMinimise: () => void;
  onRestore: () => void;
};

/**
 * Floating "Not sure who's right for you?" pill (Design decisions: sticky match
 * prompt, `promptSticky=on`, "Float behaviour, final"). Positioning is decided by
 * the page from scroll state; this component only draws it.
 */
export function MatchPill({
  href,
  external,
  size,
  dock,
  bottom,
  miniAction,
  body,
  tracking,
  onMinimise,
  onRestore,
}: MatchPillProps) {
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const style = { '--pill-bottom': bottom } as CSSProperties;

  // Full ↔ mini swaps the focused element out of the DOM (× , restore, or the
  // phone collapse near the pager). If focus was in the pill, carry it to the
  // control that replaced it instead of letting it fall to <body>.
  const asideRef = useRef<HTMLElement>(null);
  const popoverId = useId();
  const [popoverOpen, setPopoverOpen] = useState(false);
  // The popover belongs to the round icon; any change of form closes it.
  const [lastForm, setLastForm] = useState(size + miniAction);
  if (lastForm !== size + miniAction) {
    setLastForm(size + miniAction);
    setPopoverOpen(false);
  }
  const focusInside = useRef(false);
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!asideRef.current?.contains(e.target as Node)) {
        focusInside.current = false;
        setPopoverOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);
  useLayoutEffect(() => {
    const aside = asideRef.current;
    if (!aside || !focusInside.current || aside.contains(document.activeElement)) return;
    aside.querySelector<HTMLElement>('a, button')?.focus();
  }, [size, miniAction]);

  return (
    <aside
      ref={asideRef}
      aria-label="Get matched"
      className={cx(
        styles.pill,
        styles[size],
        dock === 'corner' && styles.corner,
        tracking && styles.tracking,
      )}
      data-match-pill
      onKeyDown={(e) => {
        if (e.key === 'Escape' && popoverOpen) {
          e.stopPropagation();
          setPopoverOpen(false);
          asideRef.current?.querySelector<HTMLElement>('button[aria-expanded]')?.focus();
        }
      }}
      style={style}
      onFocus={() => {
        focusInside.current = true;
      }}
      onBlur={(e) => {
        // Removing the focused element during a swap fires no blur, so any blur
        // means focus really left — including to the browser UI (relatedTarget null).
        if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) {
          focusInside.current = false;
        }
      }}
    >
      {size === 'full' ? (
        <>
          <Icon name="route" size={20} className={styles.route} />
          <span className={styles.label}>Not sure who’s right for you?</span>
          <a href={href} className={styles.cta} {...linkProps}>
            Find matches
            <Icon name={external ? 'open_in_new' : 'arrow_forward'} size={16} />
            {external && <span className="sr-only"> (opens in a new tab)</span>}
          </a>
          <button
            type="button"
            className={styles.minimise}
            aria-label="Minimise"
            onClick={onMinimise}
          >
            <Icon name="close" size={18} />
          </button>
        </>
      ) : miniAction === 'restore' ? (
        <button
          type="button"
          className={styles.mini}
          aria-label="Show “Not sure who’s right for you?”"
          title="Show “Not sure who’s right for you?”"
          onClick={onRestore}
        >
          <Icon name="route" size={24} />
        </button>
      ) : (
        <>
          <button
            type="button"
            className={styles.mini}
            aria-label="Not sure who’s right for you?"
            aria-expanded={popoverOpen}
            aria-controls={popoverOpen ? popoverId : undefined}
            onClick={() => setPopoverOpen((o) => !o)}
          >
            <Icon name="route" size={24} />
          </button>
          {/* After the toggle in the DOM, so Tab from the icon moves into it. */}
          {popoverOpen && (
            <div
              id={popoverId}
              className={styles.popover}
              role="region"
              aria-labelledby={`${popoverId}-title`}
            >
              <p id={`${popoverId}-title`} className={styles.popoverTitle}>
                <Icon name="route" size={18} className={styles.route} />
                Not sure who’s right for you?
              </p>
              <p className={styles.popoverBody}>{body}</p>
              <a href={href} className={styles.popoverCta} {...linkProps}>
                Find my matches
                <Icon name={external ? 'open_in_new' : 'arrow_forward'} size={16} />
                {external && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
