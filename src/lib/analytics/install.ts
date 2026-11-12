import { track } from './track';

/**
 * `pwa_installed`, counted on every platform (owner, 2026-11-12): the first
 * time this device opens the installed app. The browser's `appinstalled`
 * fired on Chromium only (never on iPhone or iPad), so it's no longer heard:
 * keeping it would count a Chromium install twice. An install never opened
 * isn't counted, so "installed" means a device that opened the installed app.
 */

let checked = false;

/** Tests only: a fresh app start. */
export function resetInstallForTests(): void {
  checked = false;
}

/** Set once this device's first standalone launch reached the vendor. */
export const INSTALL_SENT_KEY = 'ef_pwa_installed_sent';

/** Opened as the installed app: the manifest's `standalone`, or iOS Safari's home-screen flag. */
export function isStandalone(): boolean {
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

/**
 * Once per app start: in standalone mode, send `pwa_installed` once per
 * device. The flag is written only once the event reaches the vendor
 * (`track`'s `onSent`): never while analytics are off or a preview runs, nor
 * when a queued event is dropped, so a later launch sends it (review on PR
 * 592). Storage that throws sends nothing: better uncounted than counted on
 * every launch.
 */
export function reportInstallOnce(): void {
  // Once per app start: the device flag is only written after delivery, so a
  // second run before then (Strict Mode, a remount) must not queue it again.
  if (checked) return;
  checked = true;
  if (!isStandalone()) return;
  try {
    if (localStorage.getItem(INSTALL_SENT_KEY)) return;
    // Prove the flag can be written before sending (Safari private mode, a full quota).
    localStorage.setItem(INSTALL_SENT_KEY, 'probe');
    localStorage.removeItem(INSTALL_SENT_KEY);
  } catch {
    return;
  }
  track('pwa_installed', { method: 'standalone_launch' }, () => {
    try {
      localStorage.setItem(INSTALL_SENT_KEY, '1');
    } catch {
      // Written a moment ago; nothing more to do if it fails now.
    }
  });
}
