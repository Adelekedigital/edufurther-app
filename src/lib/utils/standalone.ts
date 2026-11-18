/**
 * How this page was opened: as the installed app (home-screen web app) or in
 * a browser tab. Browser-only; call it from an effect or a client render.
 */

/** Opened as the installed app: the manifest's `standalone`, or iOS Safari's home-screen flag. */
export function isStandalone(): boolean {
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

/**
 * The iOS major version an iPhone, iPad or iPod reports, or null. An iPad
 * asking for the desktop site reports a Mac with no iOS version: null, so it
 * keeps the default behaviour.
 */
export function iosMajor(userAgent: string): number | null {
  const m = /\b(?:iPhone|iPad|iPod)\b[^)]*\bOS (\d+)_/.exec(userAgent);
  return m ? Number(m[1]) : null;
}

/**
 * The installed app on iOS 17 or later, where `x-safari-https://` hands a
 * link to Safari proper (ADR 0013). There, a new-tab link opens an in-app
 * Safari sheet that isn't signed into the person's accounts.
 */
export function canHandOffToSafari(): boolean {
  if (typeof window === 'undefined') return false;
  return isStandalone() && (iosMajor(navigator.userAgent) ?? 0) >= 17;
}
