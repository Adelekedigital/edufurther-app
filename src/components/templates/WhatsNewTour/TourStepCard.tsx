'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '@/components/atoms/Badge/Badge';
import { Button } from '@/components/atoms/Button/Button';
import { StepBars } from '@/components/atoms/StepBars/StepBars';
import { TARGET_LABELS, TOUR_COPY as C, type TourBadgeTone } from '@/lib/copy/whatsNew';
import { cx } from '@/lib/utils/cx';
import { useFocusTrap } from '@/lib/utils/useFocusTrap';
import type { ResolvedStep } from '@/lib/utils/whatsNew';
import { anchorFor, boxOf, findTarget, frameNow, type Anchor, type Box } from './anchor';
import styles from './WhatsNewTour.module.css';

/** The badge's DS props by tone (the orange is the Featured badge's accent). */
const BADGE = {
  blue: { type: 'accent', color: 'primary' },
  green: { type: 'accent', color: 'green' },
  orange: { type: 'accent', color: 'orange' },
} as const satisfies Record<TourBadgeTone, object>;

/** The whole screen less the box: a frame of scrim around the target. */
function cutOut(b: Box): string {
  const x1 = `${b.left}px`;
  const y1 = `${b.top}px`;
  const x2 = `${b.left + b.width}px`;
  const y2 = `${b.top + b.height}px`;
  return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${x1} ${y1}, ${x2} ${y1}, ${x2} ${y2}, ${x1} ${y2}, ${x1} ${y1})`;
}

/** Marks the target while it is lit: the brand-subtle ground (WhatsNewTour.module.css). */
export const ACTIVE_ATTR = 'data-tour-active';

/**
 * Follows the target every frame while the step shows (the More sheet rising,
 * a resize, a scroll), and lights it. Cheap: a few rects a frame, for a minute.
 */
function useAnchor(target: string, card: React.RefObject<HTMLElement | null>, phone: boolean) {
  const [anchor, setAnchor] = useState<Anchor>(() => anchorFor(null, frameNow(null, phone)));
  useEffect(() => {
    let raf = 0;
    let last = '';
    let lit: HTMLElement | null = null;
    const tick = () => {
      const el = findTarget(target);
      if (el !== lit) {
        lit?.removeAttribute(ACTIVE_ATTR);
        el?.setAttribute(ACTIVE_ATTR, '');
        lit = el;
      }
      const next = anchorFor(boxOf(el), frameNow(card.current, phone));
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setAnchor(next);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      lit?.removeAttribute(ACTIVE_ATTR);
    };
  }, [target, card, phone]);
  return anchor;
}

/**
 * One guided step (ADR 0014): a real dialog beside what it points at, the
 * rest of the page dimmed behind a spotlight. Focus is held inside it
 * (useFocusTrap); Escape is Skip. The card stays mounted from step to step,
 * so focus moves to Next as each step shows.
 */
export function TourStepCard({
  step,
  index,
  total,
  phone,
  onSkip,
  onBack,
  onNext,
  onInstall,
}: {
  step: ResolvedStep;
  /** 0-based among the steps this viewer got. */
  index: number;
  total: number;
  phone: boolean;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
  /** Get the app's Install app: the install sheet (the caller's). */
  onInstall?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const pointsId = useId();
  useFocusTrap(ref, onSkip);
  const anchor = useAnchor(step.target, ref, phone);
  const last = index === total - 1;

  // Each new step: Next (or Finish) has focus, and the step is read afresh.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  }, [index]);

  const badge = BADGE[step.badge.tone];
  const { card, hole, pointer } = anchor;
  const style = {
    ...card,
    ...(pointer ? { '--tour-pointer-at': `${pointer.at}px` } : {}),
  } as CSSProperties;

  return createPortal(
    <div className={styles.layer}>
      {/* Catches clicks on the dimmed page: the tour is modal. */}
      <div className={styles.catcher} aria-hidden />
      {/* The dim, with the target cut out of it (even-odd), so it shows through. */}
      <div
        className={styles.scrim}
        style={hole ? { clipPath: cutOut(hole) } : undefined}
        aria-hidden
      />
      {hole && <div className={styles.hole} style={hole} aria-hidden />}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${bodyId} ${pointsId}`}
        tabIndex={-1}
        className={cx(
          styles.card,
          phone && styles.cardPhone,
          pointer?.side === 'left' && styles.pointLeft,
          pointer?.side === 'top' && styles.pointTop,
        )}
        style={style}
      >
        <div className={styles.cardHead}>
          <span className={styles.eyebrowText}>{C.stepOf(index + 1, total)}</span>
          <Badge type={badge.type} color={badge.color} size="sm">
            {step.badge.label}
          </Badge>
        </div>
        <h2 id={titleId} className={styles.cardTitle}>
          {step.title}
        </h2>
        <p id={bodyId} className={styles.cardBody}>
          {step.body}
        </p>
        <span id={pointsId} className="sr-only">
          {C.pointsAt(TARGET_LABELS[step.target])}
        </span>
        <div className={styles.cardFoot}>
          <StepBars dots total={total} current={index} label={C.stepOf(index + 1, total)} />
          <div className={styles.cardActions}>
            {!step.install && (
              <Button variant="text" size="medium" onClick={onSkip}>
                {C.skip}
              </Button>
            )}
            {index > 0 && (
              <Button variant="secondary-outlined" size="medium" onClick={onBack}>
                {C.back}
              </Button>
            )}
            {step.install ? (
              // Get the app: Finish moves on; Install app opens the install sheet, then moves on.
              <>
                <Button variant="text" size="medium" onClick={onNext}>
                  {last ? C.finish : C.next}
                </Button>
                <Button
                  variant="primary"
                  size="medium"
                  data-autofocus
                  onClick={() => {
                    onInstall?.();
                    onNext();
                  }}
                >
                  {C.installApp}
                </Button>
              </>
            ) : (
              <Button variant="primary" size="medium" data-autofocus onClick={onNext}>
                {last ? C.finish : C.next}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
