import { track } from './track';

/**
 * `pwa_installed`, counted on every platform (owner, 2026-11-12): the first
 * time this device opens the installed app. The browser's `appinstalled`
 * fired on Chromium only (never on iPhone or iPad), so it's no longer heard:
 * keeping it would count a Chromium install twice. An install never opened
 * isn't counted, so "installed" means a device that opened the installed app.
 */

/** Set once this device's first standalone launch was taken by `track`. */
export const INSTALL_SENT_KEY = 'ef_pwa_installed_sent';

/** Opened as the installed app: the manifest's `standalone`, or iOS Safari's home-screen flag. */
export function isStandalone(): boolean {
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

/**
 * Once per app start: in standalone mode, send `pwa_installed` once per
 * device. The flag is written only after `track` takes the event (not while
 * analytics are off or a preview runs, so it's sent later). Storage that
 * throws sends nothing: better uncounted than counted on every launch.
 */
export function reportInstallOnce(): void {
  if (!isStandalone()) return;
  try {
    if (localStorage.getItem(INSTALL_SENT_KEY)) return;
    // Prove the flag can be written before sending (Safari private mode, a full quota).
    localStorage.setItem(INSTALL_SENT_KEY, 'probe');
    localStorage.removeItem(INSTALL_SENT_KEY);
  } catch {
    return;
  }
  if (!track('pwa_installed', { method: 'standalone_launch' })) return;
  try {
    localStorage.setItem(INSTALL_SENT_KEY, '1');
  } catch {
    // Written a moment ago; nothing more to do if it fails now.
  }
}
