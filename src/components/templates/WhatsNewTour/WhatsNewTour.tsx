'use client';

import { useEffect, useMemo, useState } from 'react';
import type { InstallPlatform } from '@/lib/analytics/events';
import type { TourRoleContent, TourTarget } from '@/lib/copy/whatsNew';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { tourSteps, tourText, type ResolvedStep } from '@/lib/utils/whatsNew';
import { placeOf } from './anchor';
import { TourDone } from './TourDone';
import { TourStepCard } from './TourStepCard';
import { TourWelcome } from './TourWelcome';

/** The shell's own breakpoint: phone tabs under 768px, the rail above. */
const PHONE_LAYOUT = '(max-width: 767px)';

/** What happened, for the caller's analytics and seen list. `step` 0 is the welcome. */
export type TourEvent =
  /** On screen, with steps to show: the caller claims the visit's ask then. */
  | { type: 'opened' }
  | { type: 'started' }
  | { type: 'step'; step: number; target: TourTarget }
  | { type: 'skipped'; step: number }
  /** Finish on the last step (or no steps): the tour counts as seen. */
  | { type: 'finished' }
  /** The done card closed: its action followed (`cta`), or Got it / Escape. */
  | { type: 'completed'; action: 'cta' | 'dismiss' };

type Phase = { at: 'welcome' } | { at: 'step'; i: number } | { at: 'done' };

/**
 * A "What's new" tour (ADR 0014): the welcome, then the guided steps whose
 * targets are on this page (the rest dropped, the count "of N" without them),
 * then the done card. Presentational: the caller decides whether it shows,
 * records what was seen and tracks the events. On a step whose nav item lives
 * in the phone's More sheet, `onMore(true)` asks the shell to hold it open.
 */
export function WhatsNewTour({
  first,
  content,
  onEvent,
  onMore,
  install = null,
  onInstall,
  replayable = true,
  onClose,
}: {
  first: string;
  content: TourRoleContent;
  onEvent: (e: TourEvent) => void;
  onMore: (open: boolean) => void;
  /** How this device installs the app, or null: Get the app shows only with one. */
  install?: InstallPlatform | null;
  /** Get the app's Install app: the install sheet. */
  onInstall?: () => void;
  /** Still in the replay window: the hint and done card mention the replay. */
  replayable?: boolean;
  /** Gone: unmount it. */
  onClose: () => void;
}) {
  const phone = useMediaQuery(PHONE_LAYOUT);
  const text = tourText(content, replayable);
  const [phase, setPhase] = useState<Phase>({ at: 'welcome' });
  // Where focus was before the tour, to go back to at the very end. Read on
  // the first render: the welcome's own effect moves focus in before ours run.
  const [opener] = useState(() =>
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null),
  );

  // Resolved as it opens, and again when the layout crosses 768px (a phone
  // turned): a step's place (on screen, or in the phone's More sheet) follows.
  // Null holds the tour back: a required target is missing, or none is there.
  const steps: ResolvedStep[] | null = useMemo(
    () => tourSteps(content, placeOf, phone, install),
    [content, phone, install],
  );
  const [held] = useState(() => steps === null);
  useEffect(() => {
    // Nothing to guide through: gone, and not marked seen, so it can come back.
    if (held) onClose();
    else onEvent({ type: 'opened' });
    // Once, as it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const step =
    phase.at === 'step' && steps ? (steps[Math.min(phase.i, steps.length - 1)] ?? null) : null;

  const stepNo = step && steps ? steps.indexOf(step) + 1 : 0;
  const viaMore = step?.place === 'more';
  useEffect(() => {
    onMore(viaMore);
  }, [viaMore, onMore]);
  // Never leave the sheet held open behind a closed tour.
  useEffect(() => () => onMore(false), [onMore]);

  useEffect(() => {
    if (step) onEvent({ type: 'step', step: stepNo, target: step.target });
    // Once per step shown; onEvent's identity doesn't make it a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.target, stepNo]);

  const finish = (focusBack = true) => {
    onClose();
    if (focusBack && opener?.isConnected) opener.focus({ preventScroll: true });
  };
  const toDone = () => {
    onEvent({ type: 'finished' });
    setPhase({ at: 'done' });
  };
  const skip = () => {
    onEvent({ type: 'skipped', step: stepNo });
    finish();
  };

  // Mid-tour, a turned phone that leaves nothing to point at ends the guided
  // part: they were shown some of it, so it counts as finished, and it closes.
  const lost = phase.at === 'step' && !steps;
  useEffect(() => {
    if (!lost) return;
    onEvent({ type: 'finished' });
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lost]);

  if (held) return null;
  if (phase.at === 'welcome')
    return (
      <TourWelcome
        first={first}
        welcome={content.welcome}
        body={text.welcomeBody}
        hint={text.hint}
        onDismiss={skip}
        onStart={() => {
          onEvent({ type: 'started' });
          if (steps?.length) setPhase({ at: 'step', i: 0 });
          else toDone();
        }}
      />
    );
  if (phase.at === 'done')
    return (
      <TourDone
        done={content.done}
        body={text.doneBody}
        action={content.doneAction}
        onClose={(how) => {
          onEvent({ type: 'completed', action: how });
          // Following the action leaves the page: focus goes with the new one.
          finish(how === 'dismiss');
        }}
      />
    );
  if (!step || !steps) return null;
  const i = steps.indexOf(step);
  return (
    <TourStepCard
      step={step}
      index={i}
      total={steps.length}
      phone={phone}
      onSkip={skip}
      onBack={() => setPhase({ at: 'step', i: Math.max(0, i - 1) })}
      onInstall={onInstall}
      onNext={() => {
        if (i < steps.length - 1) return setPhase({ at: 'step', i: i + 1 });
        toDone();
      }}
    />
  );
}
