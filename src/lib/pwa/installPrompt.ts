'use client';

import { useSyncExternalStore } from 'react';
import { isStandalone } from '@/lib/utils/standalone';
import { PHONE_QUERY } from '@/lib/utils/useMediaQuery';
import type { InstallPlatform, InstallTrigger } from '@/lib/analytics/events';
import { EARLY_PROMPT } from './earlyPrompt';

/**
 * The install nudge's eager core (owner, 2026-11-18), kept to what every page
 * needs before the sheet is wanted (350kB first-load budget): the browser's
 * install prompt, kept from the first moment; whether this device can install
 * (the More menu's item); and the open sheet. Everything else, the rules, the
 * waiting moment, the analytics and the sheet, is installNudge.ts, loaded
 * when a moment happens or the More item is tapped (preloaded on idle).
 *
 * The nudge: right after a booking, a first message or finishing onboarding,
 * never on page load, a sheet offering to add the app to the home screen.
 * Phone browsers only, never in the installed app: Android and other Chromium
 * browsers install through the deferred `beforeinstallprompt`; iPhone Safari
 * has no prompt, so the sheet shows the Share steps. Everything else shows
 * nothing.
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

export type DeferredPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export { PHONE_QUERY };

/**
 * A moment waiting for its screen, kept for this tab (installNudge.ts writes
 * it): a full page load between the moment and its screen (a reload, a new
 * deploy turning a move into a page load) would otherwise lose it.
 */
export const PENDING_KEY = 'ef-install-nudge-pending';

type EarlyWindow = Window & { [EARLY_PROMPT]?: DeferredPrompt | null };

let deferred: DeferredPrompt | null = null;
let open: InstallNudge | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Tests only: a fresh app start (installNudge.ts resets its own half). */
export function resetInstallPromptForTests(): void {
  deferred = null;
  open = null;
  (window as EarlyWindow)[EARLY_PROMPT] = null;
  emit();
}

/** Stops listening; set while the listeners are on. */
let release: (() => void) | null = null;

/**
 * Listen for the browser's install prompt. Idempotent: the module calls it as
 * soon as it loads (below), so a prompt Chrome fires before the app hydrates
 * is still kept (review on PR 660); later calls return the same release.
 */
export function captureInstallPrompt(): () => void {
  if (release) return release;
  // One that came before this ran, kept by the layout's script.
  const early = (window as EarlyWindow)[EARLY_PROMPT];
  if (early && !deferred) {
    deferred = early;
    emit();
  }
  const onPrompt = (e: Event) => {
    // No mini-infobar: the prompt is offered at a moment that means something.
    e.preventDefault();
    deferred = e as DeferredPrompt;
    emit();
    // Android can't show before the prompt is in: a kept moment waits for it.
    resumeInstallMoment();
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

const nudge = () => import('./installNudge');

/**
 * One of the three moments happened: the rules decide, and the sheet waits
 * for its screen (installNudge.ts). Nothing loads where it can't show.
 */
export function noteInstallMoment(moment: InstallMoment): void {
  if (!installPlatform()) return;
  const from = location.pathname;
  void nudge().then(
    (n) => n.admit(moment, from),
    () => {},
  );
}

/**
 * A page load with a moment kept for this tab (PENDING_KEY): the rules pick
 * it up again. Only reads a key here; nothing loads unless one is kept and
 * the sheet can show on this device.
 */
export function resumeInstallMoment(): void {
  try {
    if (!sessionStorage.getItem(PENDING_KEY) || !installPlatform()) return;
  } catch {
    return;
  }
  void nudge().then(
    (n) => n.resumePending(),
    () => {},
  );
}

// From the moment this bundle runs, not from the first effect: the prompt,
// and a moment kept across a page load.
if (typeof window !== 'undefined') {
  captureInstallPrompt();
  resumeInstallMoment();
}

/** The More menu's "Install the app": the sheet now, whatever the rules. */
export async function openInstallNudge(): Promise<void> {
  if (!installPlatform() || open) return;
  (await nudge()).openFromMenu();
}

/** The sheet open now, if any. */
export function currentNudge(): InstallNudge | null {
  return open;
}

/** Opens (a nudge) or closes (null) the sheet; returns what was open. */
export function setOpen(next: InstallNudge | null): InstallNudge | null {
  const was = open;
  open = next;
  emit();
  return was;
}

/** The browser's prompt, taken: a prompt is used once. */
export function takeDeferredPrompt(): DeferredPrompt | null {
  const p = deferred;
  deferred = null;
  (window as EarlyWindow)[EARLY_PROMPT] = null;
  emit();
  return p;
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** The open sheet, for InstallNudgeRoot. */
export function useInstallOpen(): InstallNudge | null {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => null,
  );
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
