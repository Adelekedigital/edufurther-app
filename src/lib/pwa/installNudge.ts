import { track } from '@/lib/analytics/track';
import {
  currentNudge,
  installPlatform,
  PENDING_KEY,
  setOpen,
  takeDeferredPrompt,
  type InstallMoment,
  type InstallNudge,
} from './installPrompt';

/**
 * The install nudge's lazy half (owner, 2026-11-18): the rules, the waiting
 * moment, the buttons and the analytics. Loaded when a moment happens or the
 * More item is tapped (installPrompt.ts), so no page carries it up front.
 *
 * How often, per device (localStorage): at most once a visit, and one ask a
 * visit with the push ask (PushPrompt). A dismiss (the close button, Escape,
 * the backdrop, or a refused browser prompt) rests it for 7 days and counts
 * one; after 3 it never shows by itself again (the More menu's item still
 * opens it). Storage that fails shows nothing. A sheet opened from the menu
 * changes none of this: closing what you asked for isn't turning it down.
 */

/** Per device: how many dismisses, and the time it rests until. */
export const NUDGE_KEY = 'ef-install-nudge';
/** Per visit (this tab's session). */
export const SHOWN_KEY = 'ef-install-nudge-shown';
export const REST_DAYS = 7;
export const MAX_DISMISSALS = 3;
const DAY_MS = 86_400_000;
/** A beat after the moment, so the screen's own "sent" state is seen first. */
export const SHOW_DELAY_MS = 1_200;
/** Any dialog open: the nudge never covers or stacks on one. */
const OPEN_DIALOG = '[aria-modal="true"]';

/** A moment waiting for its screen; `from` is where it happened. */
export type PendingMoment = InstallMoment & { from: string };

/**
 * How long a kept moment waits across page loads: long enough for a booking's
 * modal to be read and closed, short enough not to surprise a later visit.
 */
export const PENDING_MS = 15 * 60_000;

let pending: PendingMoment | null = null;
let shownThisVisit = false;
let stopWaiting: (() => void) | null = null;

/** Tests only: a fresh app start (the tab's storage stays, as on a page load). */
export function resetInstallNudgeForTests(): void {
  stopWaiting?.();
  pending = null;
  shownThisVisit = false;
}

const TRIGGERS: readonly string[] = ['booking', 'message', 'onboarding'];

/**
 * The waiting moment, here and in the tab's storage (PENDING_KEY), so a page
 * load before its screen doesn't lose it. No name is kept: the tab may be
 * someone else's by the next load, and the sheet then says "your session".
 */
function setPending(m: PendingMoment | null): void {
  pending = m;
  try {
    if (m)
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({ trigger: m.trigger, mentor: !!m.mentor, from: m.from, at: Date.now() }),
      );
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // This tab's memory still has it.
  }
}

/** The kept moment, if it's whole and recent; anything else is dropped. */
function keptMoment(now = Date.now()): PendingMoment | null {
  try {
    const v = parse(sessionStorage.getItem(PENDING_KEY)) as Record<string, unknown> | null;
    const at = Number(v?.at);
    if (
      v &&
      typeof v.trigger === 'string' &&
      TRIGGERS.includes(v.trigger) &&
      typeof v.from === 'string' &&
      at <= now &&
      now - at < PENDING_MS
    )
      return {
        trigger: v.trigger as PendingMoment['trigger'],
        mentor: v.mentor === true,
        from: v.from,
      };
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Unreadable: nothing kept.
  }
  return null;
}

type NudgeRecord = { dismissed: number; restUntil: number };

/** A garbled record reads as none: storage works, so the rules can start again. */
function parse(raw: string | null): Partial<NudgeRecord> | null {
  try {
    return raw ? (JSON.parse(raw) as Partial<NudgeRecord> | null) : null;
  } catch {
    return null;
  }
}

/** The device's record, or null when storage can't be read and written. */
function readRecord(): NudgeRecord | null {
  try {
    const v = parse(localStorage.getItem(NUDGE_KEY));
    const rec: NudgeRecord = {
      dismissed: Number.isFinite(v?.dismissed) ? Number(v!.dismissed) : 0,
      restUntil: Number.isFinite(v?.restUntil) ? Number(v!.restUntil) : 0,
    };
    // Prove it can be written (Safari private mode, a full quota), or a
    // dismiss would be forgotten and the sheet come back next visit.
    localStorage.setItem(NUDGE_KEY, JSON.stringify(rec));
    return rec;
  } catch {
    return null;
  }
}

function shownInVisit(): boolean {
  if (shownThisVisit) return true;
  try {
    return sessionStorage.getItem(SHOWN_KEY) === '1';
  } catch {
    return true;
  }
}

function markShown(): void {
  shownThisVisit = true;
  try {
    sessionStorage.setItem(SHOWN_KEY, '1');
  } catch {
    // The module flag covers this tab.
  }
}

/** The frequency rules allow showing it by itself now. */
export function mayAutoShow(now = Date.now()): boolean {
  if (shownInVisit()) return false;
  const rec = readRecord();
  if (!rec || rec.dismissed >= MAX_DISMISSALS) return false;
  return now >= rec.restUntil;
}

/** A dismiss: one of the 3, and a rest of 7 days. */
function strike(): void {
  const rec = readRecord();
  if (!rec) return;
  try {
    localStorage.setItem(
      NUDGE_KEY,
      JSON.stringify({ dismissed: rec.dismissed + 1, restUntil: Date.now() + REST_DAYS * DAY_MS }),
    );
  } catch {
    // Unwritable now: readRecord() then says no, so it doesn't show again.
  }
}

/** Onboarding's moment waits for the next screen, so the matches reveal is never covered. */
const onItsScreen = (m: PendingMoment) =>
  m.trigger !== 'onboarding' || location.pathname !== m.from;

/**
 * Waits, then shows: a beat after the moment, once no dialog is open (a
 * booking's modal closes first) and, for onboarding, on the next screen.
 * Page changes and dialogs both change the DOM, so one observer hears both.
 */
function waitToShow(): void {
  stopWaiting?.();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ready = () => !!pending && onItsScreen(pending) && !document.querySelector(OPEN_DIALOG);
  const attempt = () => {
    if (timer !== undefined || !ready()) return;
    watcher.disconnect();
    timer = setTimeout(() => {
      timer = undefined;
      // A dialog opened (or the page changed back) meanwhile: wait again.
      if (ready()) {
        stopWaiting = null;
        showPending();
      } else watcher.observe(document.body, { childList: true, subtree: true });
    }, SHOW_DELAY_MS);
  };
  const watcher = new MutationObserver(attempt);
  watcher.observe(document.body, { childList: true, subtree: true });
  stopWaiting = () => {
    clearTimeout(timer);
    watcher.disconnect();
    stopWaiting = null;
  };
  attempt();
}

/**
 * A moment, if the rules allow: it waits for its screen. A later moment
 * replaces an earlier one, being more specific.
 */
export function admit(moment: InstallMoment, from: string): void {
  if (currentNudge() || !installPlatform() || !mayAutoShow()) return;
  setPending({ ...moment, from });
  waitToShow();
}

/**
 * After a page load: the moment kept for this tab waits for its screen again,
 * if the rules still allow it (installPrompt's resumeInstallMoment).
 */
export function resumePending(): void {
  if (pending || currentNudge()) return;
  const m = keptMoment();
  if (!m || !installPlatform()) return;
  if (!mayAutoShow()) {
    setPending(null);
    return;
  }
  pending = m;
  waitToShow();
}

function show(nudge: InstallNudge): void {
  setPending(null);
  stopWaiting?.();
  markShown();
  setOpen(nudge);
  track('install_nudge_shown', { trigger: nudge.trigger, platform: nudge.platform });
}

/** The waiting moment's sheet, if the rules still allow it; the moment is used either way. */
export function showPending(): boolean {
  const m = pending;
  setPending(null);
  if (!m) return false;
  const platform = installPlatform();
  if (currentNudge() || !platform || !mayAutoShow()) return false;
  show({ trigger: m.trigger, platform, name: m.name?.trim() || null, mentor: !!m.mentor });
  return true;
}

/** The More menu's "Install the app": the sheet now, whatever the rules. */
export function openFromMenu(trigger: AskedTrigger = 'menu'): void {
  const platform = installPlatform();
  if (!platform || currentNudge()) return;
  show({ trigger, platform, name: null, mentor: false });
}

/** Opened because the person asked: the More menu, or the What's new tour's Install app. */
type AskedTrigger = 'menu' | 'tour';

/**
 * One ask per visit (owner, 2026-11-18): the nudge is up, waiting, or has
 * shown this visit, so the push ask waits for a later visit (PushPrompt).
 */
export function installNudgeBusy(): boolean {
  return currentNudge() !== null || pending !== null || shownInVisit() || keptMoment() !== null;
}

/**
 * The What's new tour asks for this visit (owner, 2026-11-20): it wins on
 * Home, so a waiting nudge waits for another visit. False, and nothing
 * changed, when the nudge is up or an ask has already shown this visit: then
 * the tour waits instead, never two asks in one visit.
 */
export function claimVisitForTour(): boolean {
  if (currentNudge() !== null || shownInVisit()) return false;
  notePushAskShown();
  return true;
}

/** The push ask showed this visit: the nudge then waits for another visit. */
export function notePushAskShown(): void {
  markShown();
  setPending(null);
  stopWaiting?.();
}

const auto = (n: InstallNudge) => n.trigger !== 'menu' && n.trigger !== 'tour';

/**
 * Android's "Add to home screen": the browser's prompt, its answer counted.
 * The sheet closes first, so focus is back on the page under the prompt.
 * iPhone has no button: a tap can't prove an install, and `pwa_installed`
 * counts the real one on the first home-screen launch.
 */
export async function acceptInstall(): Promise<void> {
  const n = setOpen(null);
  if (!n || n.platform !== 'android') return;
  const props = { trigger: n.trigger, platform: n.platform };
  // A prompt is used once; the browser sends a fresh one if it may ask again.
  const prompt = takeDeferredPrompt();
  if (!prompt) return;
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      track('install_nudge_accepted', props);
      return;
    }
    track('install_nudge_dismissed', { ...props, how: 'prompt_dismissed' });
    if (auto(n)) strike();
  } catch {
    // The browser refused to show it: nothing was asked.
  }
}

/** The close button, Escape or the backdrop: a dismiss, resting it 7 days and counting one. */
export function closeInstall(): void {
  const n = setOpen(null);
  if (!n) return;
  track('install_nudge_dismissed', { trigger: n.trigger, platform: n.platform, how: 'closed' });
  if (auto(n)) strike();
}
