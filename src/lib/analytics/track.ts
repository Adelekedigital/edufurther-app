import type { AnalyticsEvent, AnalyticsEvents, PersonProperties } from './events';

/**
 * Our analytics interface (PRD 30): every screen calls these, nothing imports
 * the vendor. The vendor arrives as a `Sink`, connected by the consent code
 * once someone accepts (lib/vendor/analytics.ts behind it). Until then events
 * wait in memory; a decline drops them.
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
  | { kind: 'capture'; event: string; props: Record<string, unknown> }
  | { kind: 'identify'; userId: string; props: PersonProperties };

let sink: Sink | null = null;
let queue: Queued[] = [];
let blocked: () => boolean = () => false;

/** One event, typed by the schema. A no-op while blocked; queued until a sink connects. */
export function track<K extends AnalyticsEvent>(event: K, props: AnalyticsEvents[K]): void {
  if (blocked()) return;
  const p = props as Record<string, unknown>;
  if (sink) sink.capture(event, p);
  else enqueue({ kind: 'capture', event, props: p });
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
      if (q.kind === 'capture') connect.capture(q.event, q.props);
      else connect.identify(q.userId, q.props);
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

/** A part of the app whose session replay the vendor side may record (PRD 30). */
type ReplayScope = 'booking';
type ReplayListener = (scope: ReplayScope, on: boolean) => void;

const replayOn = new Set<ReplayScope>();
const replayListeners = new Set<ReplayListener>();

/**
 * The booking flow opened (`on`) or closed. Only the flag lives here; the
 * vendor side listens (onReplayScope) and starts or stops recording.
 */
export function setReplayScope(scope: 'booking', on: boolean): void {
  if (on) replayOn.add(scope);
  else replayOn.delete(scope);
  for (const fn of replayListeners) fn(scope, on);
}

/** Hears every replay-scope change; returns the unsubscribe. */
export function onReplayScope(fn: (scope: 'booking', on: boolean) => void): () => void {
  replayListeners.add(fn);
  return () => {
    replayListeners.delete(fn);
  };
}

/** Tests only: back to a fresh page. */
export function resetForTests(): void {
  sink = null;
  queue = [];
  blocked = () => false;
  replayOn.clear();
  replayListeners.clear();
}
