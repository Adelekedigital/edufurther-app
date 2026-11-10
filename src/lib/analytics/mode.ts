import { isCurrent, type ConsentAnswer } from './consent';

/**
 * How this page may track (PRD 30 and the owner's two flags):
 * - `off`: nothing loads, nothing is sent (flag off, no key, a preview, tests).
 * - `cookieless`: aggregate counts only; no stored identifier, no identify,
 *   no replay. Before an answer, after a decline, and always while the
 *   banner flag is off.
 * - `identified`: after Accept (banner flag on): persistence, identify, and
 *   replay on the allowed routes.
 */
export type AnalyticsMode = 'off' | 'cookieless' | 'identified';

export type ModeInputs = {
  analyticsOn: boolean;
  bannerOn: boolean;
  /** The SDK can load: a project key is set. */
  keySet: boolean;
  /** Preview as user is active in this tab: nothing is sent as anyone. */
  previewing: boolean;
  answer: ConsentAnswer | null;
};

export function analyticsMode(i: ModeInputs): AnalyticsMode {
  if (!i.analyticsOn || !i.keySet || i.previewing) return 'off';
  if (i.bannerOn && isCurrent(i.answer) && i.answer.granted) return 'identified';
  return 'cookieless';
}

/** The banner shows while unanswered: flags on, not previewing, no current answer. */
export function bannerShown(i: Omit<ModeInputs, 'keySet'>): boolean {
  return i.analyticsOn && i.bannerOn && !i.previewing && !isCurrent(i.answer);
}

/**
 * Replay runs only on onboarding and booking surfaces (PRD 30): the
 * onboarding flows, and Explore and mentor profiles, where the booking modal
 * opens. Never Messages; intake answers and message dialogs on these routes
 * are blocked inside the recording (`data-no-replay`, lib/vendor/analytics).
 */
const REPLAY_PREFIXES = ['/onboarding', '/explore', '/mentors/'];

export function replayAllowed(path: string): boolean {
  return REPLAY_PREFIXES.some((p) =>
    p.endsWith('/') ? path.startsWith(p) : path === p || path.startsWith(`${p}/`),
  );
}
