'use client';

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { BottomSheet } from '@/components/templates/BottomSheet/BottomSheet';
import { stopEscape } from '@/lib/utils/focus';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import styles from './Popover.module.css';

type PopoverProps = {
  /** The dialog's name: the panel's heading on desktop, the sheet's on phones. */
  title: string;
  /** Put on the trigger's `aria-controls`. */
  id: string;
  /** The button that opened it: a click on it isn't "outside", and focus comes back to it. */
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  /** Which edge of the trigger the panel lines up with. */
  align?: 'start' | 'end';
};

/**
 * A panel for reading that opens from a button (Admin Analytics.dc.html alerts):
 * under the button on desktop, a non-modal dialog that closes on Escape, a click
 * outside or focus leaving it; on phones the shared `BottomSheet`. The caller
 * wraps the trigger and this in a `position: relative` box.
 *
 * Focus moves into the panel, and when it closes with focus inside (Escape, or
 * an action that closes it) focus goes back to the trigger, never to the page.
 */
export function Popover({
  title,
  id,
  triggerRef,
  onClose,
  children,
  align = 'start',
}: PopoverProps) {
  const phone = useMediaQuery('(max-width: 767px)');
  if (phone) {
    return (
      <BottomSheet title={title} onClose={onClose}>
        {children}
      </BottomSheet>
    );
  }
  return (
    <Panel title={title} id={id} triggerRef={triggerRef} onClose={onClose} align={align}>
      {children}
    </Panel>
  );
}

function Panel({ title, id, triggerRef, onClose, children, align }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Through a ref, so a new `onClose` each render doesn't rebind the listener.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const panel = ref.current;
    const trigger = triggerRef.current;
    panel?.focus({ preventScroll: true });
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel?.contains(t) && !trigger?.contains(t)) close.current();
    };
    document.addEventListener('pointerdown', outside, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      // Closed with focus inside: the panel is gone, so focus would fall to the page.
      if (panel?.contains(document.activeElement) || document.activeElement === document.body) {
        trigger?.focus({ preventScroll: true });
      }
    };
  }, [triggerRef]);

  return (
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={styles.panel}
      data-align={align}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        stopEscape(e);
        onClose();
      }}
      onBlur={(e) => {
        const to = e.relatedTarget as Node | null;
        // Tabbing out closes it; a click elsewhere is the pointer listener's.
        if (to && !ref.current?.contains(to) && !triggerRef.current?.contains(to)) onClose();
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {children}
    </div>
  );
}
