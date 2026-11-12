import type { AnalyticsEvent, AnalyticsEvents, PersonProperties } from './events';

/**
 * Our analytics interface (PRD 30): every screen calls these, nothing imports
 * the vendor. The vendor arrives as a `Sink`, connected by the analytics root
 * (app/_shell/AnalyticsRoot, lib/vendor/analytics.ts behind it) once it has
 * loaded in the mode consent allows: cookieless before an answer and after a
 * decline (its sink drops identify), identified after Accept. Until then
 * events wait in memory; `setConsent(false)` (off, a preview) drops them.
 *
 * Nothing is sent while blocked: a preview session (PRD 27), tests, Storybook,
 * or the feature flag off. `setBlocked` takes the check so this file knows no
 * screen.
 */

export type Sink = {
  capture: (event: string, props: Record<string, unknown>) => void;
  identify: (userId: string, props: PersonProperties) => void;
  reset: () => void;
};

/** Events before consent, oldest first. Capped: a long-undecided visit can't grow it. */
const MAX_QUEUED = 100;

type Queued =
  | { kind: 'capture'; event: string; props: Record<string, unknown>; onSent?: () => void }
  | { kind: 'identify'; userId: string; props: PersonProperties };

let sink: Sink | null = null;
let queue: Queued[] = [];
let blocked: () => boolean = () => false;

/**
 * One event, typed by the schema. A no-op while blocked; queued until a sink
 * connects. `onSent` runs once the event reaches the vendor: at once with a
 * sink, else when the queue is sent; never if it's blocked or the queue is
 * dropped (off, a preview, a decline before load). A once-only event
 * (`pwa_installed`) marks itself sent there.
 */
export function track<K extends AnalyticsEvent>(
  event: K,
  props: AnalyticsEvents[K],
  onSent?: () => void,
): void {
  if (blocked()) return;
  const p = props as Record<string, unknown>;
  if (sink) {
    sink.capture(event, p);
    onSent?.();
  } else enqueue({ kind: 'capture', event, props: p, onSent });
}

/** Links this device's anonymous id to the account: `users.id`, never an email or name. */
export function identify(userId: string, props: PersonProperties): void {
  if (blocked()) return;
  if (sink) sink.identify(userId, props);
  else enqueue({ kind: 'identify', userId, props });
}

/** Log-out: the next person on this device starts fresh. */
export function reset(): void {
  queue = [];
  sink?.reset();
}

/**
 * The consent answer. Accept connects the vendor's sink and sends what waited;
 * decline (or a withdrawal) disconnects it and drops the queue, in this session.
 */
export function setConsent(granted: boolean, connect?: Sink): void {
  if (granted && connect) {
    sink = connect;
    const waiting = queue;
    queue = [];
    for (const q of waiting) {
      if (q.kind === 'capture') {
        connect.capture(q.event, q.props);
        q.onSent?.();
      } else connect.identify(q.userId, q.props);
    }
    return;
  }
  sink = null;
  queue = [];
}

/** The guard the app installs once (preview, flag); tests leave it open. */
export function setBlocked(check: () => boolean): void {
  blocked = check;
}

function enqueue(q: Queued) {
  if (queue.length >= MAX_QUEUED) queue.shift();
  queue.push(q);
}

/**
 * Where replay may record beyond its routes (PRD 30): the booking modal opens
 * on Explore and profiles, so BookingFlow turns `booking` on while it is open
 * and off when it closes. The analytics root listens; replay still needs
 * Accept, and blocked parts ([data-no-replay]) stay blocked.
 */
export type ReplayScope = 'booking';

const scopes = new Set<ReplayScope>();
const scopeListeners = new Set<() => void>();

export function setReplayScope(scope: ReplayScope, on: boolean): void {
  if (scopes.has(scope) === on) return;
  if (on) scopes.add(scope);
  else scopes.delete(scope);
  scopeListeners.forEach((l) => l());
}

/** True while any scope is open. */
export function replayScopeActive(): boolean {
  return scopes.size > 0;
}

export function onReplayScope(listener: () => void): () => void {
  scopeListeners.add(listener);
  return () => {
    scopeListeners.delete(listener);
  };
}

/** Tests only: back to a fresh page. */
export function resetForTests(): void {
  sink = null;
  queue = [];
  blocked = () => false;
  scopes.clear();
  scopeListeners.clear();
}
