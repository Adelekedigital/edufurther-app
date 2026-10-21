'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import { useEdgeFlip } from '@/lib/utils/useEdgeFlip';
import styles from './InfoTip.module.css';

type InfoTipProps = {
  /**
   * The hint text. It is also the trigger's accessible name, so a screen reader
   * announces it on focus whether or not the bubble is open.
   */
  label: string;
  className?: string;
};

/**
 * A contextual-help affordance (BFM UX Bite "Contextualising dates", PostHog):
 * an ⓘ icon that reveals a short hint on demand, instead of crowding the label.
 *
 * Built against the hover-only tooltip's failure mode — the old `title` on a
 * span was dead to keyboard and touch. This opens on hover AND focus (a tap
 * focuses the button, so touch works), and closes on Escape or blur, so every
 * input reaches it. The hint is the button's `aria-label`, so it reaches a
 * screen reader on focus; the visible bubble is a sighted-only echo and is
 * `aria-hidden` to avoid a double announcement.
 *
 * The bubble is right-anchored to the icon; in a left-hand grid cell that would
 * push it off the left edge, so it flips to open rightward when it would clip.
 */
export function InfoTip({ label, className }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  // Hover (mouse) and focus (keyboard + tap) each hold the bubble open on their
  // own. Blur clears both, so a tap — which some mobile browsers answer with a
  // synthetic mouseenter but no matching mouseout — can't leave `hovering` stuck
  // true once focus leaves.
  const hovering = useRef(false);
  const focused = useRef(false);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const sync = () => setOpen(hovering.current || focused.current);

  const flipped = useEdgeFlip(open, bubbleRef);

  return (
    <span className={cx(styles.wrap, className)}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        onMouseEnter={() => {
          hovering.current = true;
          sync();
        }}
        onMouseLeave={() => {
          hovering.current = false;
          sync();
        }}
        onFocus={() => {
          focused.current = true;
          sync();
        }}
        onBlur={() => {
          hovering.current = false;
          focused.current = false;
          sync();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            // Dismiss but keep focus on the trigger (tooltip convention); the
            // refs stay in step so a later hover or re-focus reopens it. Stop
            // the event here so dismissing the tip doesn't also close a parent
            // modal — a second Escape (tip already closed) falls through to it.
            hovering.current = false;
            focused.current = false;
            setOpen(false);
            e.stopPropagation();
          }
        }}
      >
        <Icon name="info" size={16} />
      </button>
      {open && (
        <span
          ref={bubbleRef}
          aria-hidden="true"
          className={cx(styles.bubble, flipped && styles.flipped)}
        >
          {label}
        </span>
      )}
    </span>
  );
}
