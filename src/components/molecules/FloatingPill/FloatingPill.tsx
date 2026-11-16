import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './FloatingPill.module.css';

export type FloatingPillProps = {
  /** Distance from the bottom of the viewport, as a CSS length (clear of the tab bar). */
  bottom: string;
  /** Centre of the viewport, or docked to the bottom-right corner. */
  dock?: 'center' | 'corner';
  /** The page moves `bottom` every frame (following a scroll): no bottom transition. */
  tracking?: boolean;
  className?: string;
  /** The pill itself: its look and controls belong to the caller. */
  children: ReactNode;
};

/**
 * The one floating pill placement above the page (Explore's match pill, the
 * profile's Book pill): fixed, centred on the content column even while a
 * scroll lock pads the page (`--fixed-center-x`), at a bottom the caller
 * passes, and hidden while a modal or sheet is open. It only places; what it
 * holds draws itself.
 */
export function FloatingPill({
  bottom,
  dock = 'center',
  tracking,
  className,
  children,
}: FloatingPillProps) {
  const style = { '--pill-bottom': bottom } as CSSProperties;
  return (
    <div
      className={cx(
        styles.float,
        dock === 'corner' && styles.corner,
        tracking && styles.tracking,
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
