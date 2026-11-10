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
  /**
   * For reading: text, links, buttons. Nothing that portals its own focusable
   * part (a Select's list): focus moving there reads as leaving, and closes it.
   */
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
      <BottomSheet title={title} id={id} onClose={onClose}>
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

  // Whether focus is in the panel, so closing knows to hand it back. Read at
  // cleanup, when the panel has already left the page and can't be asked.
  const focusInside = useRef(false);

  useEffect(() => {
    const panel = ref.current;
    const trigger = triggerRef.current;
    panel?.focus({ preventScroll: true });
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel?.contains(t) || trigger?.contains(t)) return;
      // The click puts focus where it lands: don't pull it back to the trigger.
      focusInside.current = false;
      close.current();
    };
    document.addEventListener('pointerdown', outside, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      // Closed with focus inside (Escape, an action in it): the panel is gone,
      // so focus would fall to the page. A trigger that went too has nothing to take it.
      if (focusInside.current && trigger?.isConnected) trigger.focus({ preventScroll: true });
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
      onFocus={() => {
        focusInside.current = true;
      }}
      onBlur={(e) => {
        const to = e.relatedTarget as Node | null;
        // No target: the window lost focus, or the panel is leaving; either way it comes back.
        if (!to || ref.current?.contains(to)) return;
        focusInside.current = false;
        // Tabbing out closes it (back to the trigger keeps it open); a click
        // elsewhere is the pointer listener's.
        if (!triggerRef.current?.contains(to)) onClose();
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {children}
    </div>
  );
}
