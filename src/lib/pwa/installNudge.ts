'use client';

import { useSyncExternalStore } from 'react';
import { isStandalone } from '@/lib/utils/standalone';
import type { InstallPlatform, InstallTrigger } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

/**
 * The install nudge (owner, 2026-11-18): a sheet offering to add the app to
 * the home screen, right after a booking, a first message or finishing
 * onboarding, never on page load. Phone browsers only, never in the
 * installed app. Android and other Chromium browsers install through the
 * deferred `beforeinstallprompt`; iPhone Safari has no prompt, so the sheet
 * shows the Share steps instead. Everything else shows nothing.
 *
 * How often, per device (localStorage): at most once a visit. A dismiss (the
 * close button, Escape, the backdrop, or a refused browser prompt) rests it
 * for 7 days and counts one; after 3 it never shows by itself again (the More
 * menu's "Install the app" still opens it). Storage that fails shows nothing.
 * A sheet opened from the menu changes none of this: closing what you asked
 * for isn't turning the nudge down.
 */

export type { InstallPlatform, InstallTrigger };

/** What just happened. `name`: whose session or chat, for the sheet's line. */
export type InstallMoment = {
  trigger: Exclude<InstallTrigger, 'menu'>;
  name?: string | null;
  /** A mentor finished onboarding: they have no matches to mention. */
  mentor?: boolean;
};

/** The sheet as it shows. */
export type InstallNudge = {
  trigger: InstallTrigger;
  platform: InstallPlatform;
  name: string | null;
  mentor: boolean;
};

/** A moment waiting for its screen; `from` is where it happened. */
export type PendingMoment = InstallMoment & { from: string };

type DeferredPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** Per device: how many dismisses, and the time it rests until. */
export const NUDGE_KEY = 'ef-install-nudge';
/** Per visit (this tab's session). */
export const SHOWN_KEY = 'ef-install-nudge-shown';
export const REST_DAYS = 7;
export const MAX_DISMISSALS = 3;
const DAY_MS = 86_400_000;

/** A phone: the app's 768px breakpoint, and a touch screen (a narrow desktop window isn't one). */
export const PHONE_QUERY = '(max-width: 767px) and (pointer: coarse)';

let deferred: DeferredPrompt | null = null;
let open: InstallNudge | null = null;
let pending: PendingMoment | null = null;
let shownThisVisit = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Tests only: a fresh app start. */
export function resetInstallNudgeForTests(): void {
  deferred = null;
  open = null;
  pending = null;
  shownThisVisit = false;
  emit();
}

/**
 * Keeps the browser's install prompt for the sheet's button, and forgets it
 * once the app is installed. Mounted once (InstallNudgeRoot); returns the cleanup.
 */
let release: (() => void) | null = null;

/**
 * Listen for the browser's install prompt. Idempotent: the module calls it as
 * soon as it loads (below), so a prompt Chrome fires before the app hydrates
 * is still kept (review on PR 660); later calls return the same release.
 */
export function captureInstallPrompt(): () => void {
  if (release) return release;
  const onPrompt = (e: Event) => {
    // No mini-infobar: the prompt is offered at a moment that means something.
    e.preventDefault();
    deferred = e as DeferredPrompt;
    emit();
  };
  const onInstalled = () => {
    deferred = null;
    emit();
  };
  window.addEventListener('beforeinstallprompt', onPrompt);
  window.addEventListener('appinstalled', onInstalled);
  release = () => {
    window.removeEventListener('beforeinstallprompt', onPrompt);
    window.removeEventListener('appinstalled', onInstalled);
    release = null;
  };
  return release;
}

// Capture from the moment this bundle runs, not from the first effect.
if (typeof window !== 'undefined') captureInstallPrompt();

/**
 * Safari on an iPhone or iPad. Add to Home Screen is Safari's on older iOS,
 * so Chrome, Firefox, Edge, Opera, the Google app and in-app browsers (no
 * `Version/… Safari/`) are out. iPadOS reads as a Mac with touch.
 */
export function isIosSafari(ua: string, touchPoints: number): boolean {
  const ios = /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
  if (!ios) return false;
  if (
    /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|YaBrowser|DuckDuckGo|FBAN|FBAV|Instagram|Line\//.test(ua)
  )
    return false;
  return /Version\/[\d.]+.*Safari\//.test(ua);
}

/** How this device installs, or null when the sheet can't help here. */
export function installPlatform(): InstallPlatform | null {
  if (typeof window === 'undefined') return null;
  try {
    if (isStandalone()) return null;
    if (window.matchMedia?.(PHONE_QUERY).matches !== true) return null;
  } catch {
    return null;
  }
  if (deferred) return 'android';
  if (isIosSafari(navigator.userAgent, navigator.maxTouchPoints ?? 0)) return 'ios';
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
    const raw = localStorage.getItem(NUDGE_KEY);
    const v = parse(raw);
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

function writeRecord(rec: NudgeRecord): void {
  try {
    localStorage.setItem(NUDGE_KEY, JSON.stringify(rec));
  } catch {
    // Unwritable now: readRecord() then says no, so it doesn't show again.
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
  writeRecord({ dismissed: rec.dismissed + 1, restUntil: Date.now() + REST_DAYS * DAY_MS });
}

/**
 * One of the three moments happened. Queued for the screen to show when it
 * can (InstallNudgeRoot: no dialog open; onboarding's on the next screen); a
 * later moment replaces an earlier one, being more specific.
 */
export function noteInstallMoment(moment: InstallMoment): void {
  if (open || !installPlatform() || !mayAutoShow()) return;
  pending = { ...moment, from: typeof location === 'undefined' ? '' : location.pathname };
  emit();
}

function show(nudge: InstallNudge): void {
  pending = null;
  open = nudge;
  markShown();
  track('install_nudge_shown', { trigger: nudge.trigger, platform: nudge.platform });
  emit();
}

/** The queued moment's sheet, if the rules still allow it; the moment is used either way. */
export function showPending(): boolean {
  const m = pending;
  if (!m) return false;
  const platform = installPlatform();
  if (open || !platform || !mayAutoShow()) {
    pending = null;
    emit();
    return false;
  }
  show({ trigger: m.trigger, platform, name: m.name?.trim() || null, mentor: !!m.mentor });
  return true;
}

/** The More menu's "Install the app": the sheet now, whatever the rules. */
export function openInstallNudge(): void {
  const platform = installPlatform();
  if (!platform || open) return;
  show({ trigger: 'menu', platform, name: null, mentor: false });
}

/**
 * One ask per visit (owner, 2026-11-18): the nudge is up, on its way, or has
 * shown this visit, so the push ask waits for a later visit (PushPrompt).
 */
export function installNudgeBusy(): boolean {
  return open !== null || pending !== null || shownInVisit();
}

/** The push ask showed this visit: the nudge then waits for another visit. */
export function notePushAskShown(): void {
  markShown();
  pending = null;
  emit();
}

function close(): InstallNudge | null {
  const n = open;
  open = null;
  emit();
  return n;
}

const auto = (n: InstallNudge) => n.trigger !== 'menu';

/**
 * Android's "Add to home screen": the browser's prompt, its answer counted.
 * The sheet closes first, so focus is back on the page under the prompt.
 * iPhone has no button: a tap can't prove an install, and `pwa_installed`
 * counts the real one on the first home-screen launch.
 */
export async function acceptInstall(): Promise<void> {
  const n = close();
  if (!n) return;
  const props = { trigger: n.trigger, platform: n.platform };
  if (n.platform !== 'android') return;
  const prompt = deferred;
  // A prompt is used once; the browser sends a fresh one if it may ask again.
  deferred = null;
  emit();
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
  const n = close();
  if (!n) return;
  track('install_nudge_dismissed', { trigger: n.trigger, platform: n.platform, how: 'closed' });
  if (auto(n)) strike();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** The sheet that's open and the moment waiting, for InstallNudgeRoot. */
export function useInstallNudge(): { open: InstallNudge | null; pending: PendingMoment | null } {
  return {
    open: useSyncExternalStore(
      subscribe,
      () => open,
      () => null,
    ),
    pending: useSyncExternalStore(
      subscribe,
      () => pending,
      () => null,
    ),
  };
}

function subscribeAvailable(l: () => void): () => void {
  const off = subscribe(l);
  let mql: MediaQueryList | null = null;
  try {
    mql = window.matchMedia?.(PHONE_QUERY) ?? null;
    mql?.addEventListener?.('change', l);
  } catch {
    mql = null;
  }
  return () => {
    off();
    mql?.removeEventListener?.('change', l);
  };
}

/** The sheet can help on this device now: the More menu's entry shows. */
export function useInstallAvailable(): boolean {
  return useSyncExternalStore(
    subscribeAvailable,
    () => installPlatform() !== null,
    () => false,
  );
}
