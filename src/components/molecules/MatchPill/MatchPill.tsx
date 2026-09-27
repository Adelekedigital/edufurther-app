'use client';

import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
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
  /** The mini icon either restores the pill (after ×) or opens matches. */
  miniAction: 'restore' | 'open';
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
  const focusInside = useRef(false);
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!asideRef.current?.contains(e.target as Node)) focusInside.current = false;
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
      style={style}
      onFocus={() => {
        focusInside.current = true;
      }}
      onBlur={(e) => {
        // A blur caused by the swap itself has no relatedTarget; only a move to
        // another real element on the page means focus has left the pill.
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) {
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
        <a
          href={href}
          className={styles.mini}
          aria-label="Find my mentor matches"
          title="Find my mentor matches"
          {...linkProps}
        >
          <Icon name="route" size={24} />
        </a>
      )}
    </aside>
  );
}
