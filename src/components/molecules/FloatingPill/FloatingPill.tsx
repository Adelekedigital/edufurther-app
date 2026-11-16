'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { cx } from '@/lib/utils/cx';
import { useLatest } from '@/lib/utils/useLatest';
import styles from './FloatingPill.module.css';

export type FloatingPillProps = {
  /** Distance from the bottom of the viewport, as a CSS length (clear of the tab bar). */
  bottom: string;
  /** Centre of the viewport, or docked to the bottom-right corner. */
  dock?: 'center' | 'corner';
  /** The page moves `bottom` every frame (following a scroll): no bottom transition. */
  tracking?: boolean;
  className?: string;
  /**
   * Where focus goes if the pill leaves the page while it holds focus (the
   * page stops drawing it). Without it, focus would fall to <body>.
   */
  onFocusLost?: () => void;
  /** The pill itself: its look and controls belong to the caller. */
  children: ReactNode;
};

/**
 * The one floating pill placement above the page (Explore's match pill, the
 * profile's Book pill): fixed, centred on the content column even while a
 * scroll lock pads the page (`--fixed-center-x`), at a bottom the caller
 * passes, and hidden while a modal or sheet is open. It also keeps keyboard
 * focus from falling to <body>: when what it holds swaps the focused control
 * out (MatchPill full ↔ mini), focus moves to the control that replaced it;
 * when the pill itself goes, to `onFocusLost`.
 */
export function FloatingPill({
  bottom,
  dock = 'center',
  tracking,
  className,
  onFocusLost,
  children,
}: FloatingPillProps) {
  const style = { '--pill-bottom': bottom } as CSSProperties;
  const boxRef = useRef<HTMLDivElement>(null);
  const focusLost = useLatest(onFocusLost);
  // The latest handler at the moment the pill leaves, not the first render's.
  const handOff = useCallback(() => focusLost.current?.(), [focusLost]);
  // Whether focus is in the pill. Removing the focused element fires no blur,
  // so after a swap this still says it was here.
  const focusInside = useRef(false);
  useEffect(() => {
    // A press elsewhere means the user moved on: never pull focus back after it.
    const onPointerDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) focusInside.current = false;
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);
  // Every render: a swap inside that dropped the focused control.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || !focusInside.current || box.contains(document.activeElement)) return;
    box.querySelector<HTMLElement>('a, button')?.focus();
  });
  // Leaving the page: the cleanup runs before React removes the box, so the
  // focused control is still in it.
  useLayoutEffect(() => {
    const box = boxRef.current;
    return () => {
      if (box?.contains(document.activeElement)) handOff();
    };
  }, [handOff]);

  return (
    <div
      ref={boxRef}
      className={cx(
        styles.float,
        dock === 'corner' && styles.corner,
        tracking && styles.tracking,
        className,
      )}
      style={style}
      // A stable hook for tests and page checks, whatever the pill holds.
      data-floating-pill
      onFocus={() => {
        focusInside.current = true;
      }}
      onBlur={(e) => {
        // Any blur that leaves the box (to the browser UI too: relatedTarget null).
        if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) {
          focusInside.current = false;
        }
      }}
    >
      {children}
    </div>
  );
}
