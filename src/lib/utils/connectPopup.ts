/**
 * Run an OAuth consent in a popup and wait for the server to show the result.
 *
 * The backend's callback answers JSON rather than redirecting, because the API
 * does not know a front-end URL and guessing one is how a deployment redirects
 * somewhere that does not exist. So the popup ends on the API's origin, which
 * we cannot read — the only honest signal is asking our own API whether the
 * grant now exists.
 *
 * The consent is never recorded as pending, so denying it changes nothing
 * server-side and nothing ever flips (backend reply #4). Hence the timeout:
 * without one, a mentor who presses Deny waits for ever.
 */

export type ConnectOutcome = 'connected' | 'cancelled' | 'timeout' | 'blocked';

export type ConnectPopupOptions = {
  /** Resolves true once the server shows the connection. Must not throw. */
  isDone: () => Promise<boolean>;
  /** How often to ask. */
  pollMs?: number;
  /** Give up after this long and let the caller offer another go. */
  timeoutMs?: number;
  /** Swappable for tests. */
  now?: () => number;
  openWindow?: (url: string, target: string, features: string) => Window | null;
};

const FEATURES = 'popup=yes,width=520,height=680,noopener=no,noreferrer=no';

/**
 * Opens the popup immediately — a window opened after an `await` is blocked,
 * because it has lost the user gesture. Point it at the URL once you have one.
 */
export function openConsentWindow(
  open: ConnectPopupOptions['openWindow'] = (u, t, f) => window.open(u, t, f),
): Window | null {
  return open('', 'ef-google-calendar', FEATURES) ?? null;
}

/**
 * Sends an already-open popup to `url`, then polls until the server agrees,
 * the popup closes, or we give up. Closes the popup on success — it would
 * otherwise sit on a page of JSON that means nothing to anyone.
 */
export async function waitForConsent(
  popup: Window | null,
  url: string,
  {
    isDone,
    pollMs = 1500,
    timeoutMs = 180_000,
    now = () => Date.now(),
  }: ConnectPopupOptions,
): Promise<ConnectOutcome> {
  if (!popup) return 'blocked';
  popup.location.replace(url);

  const started = now();
  let closedAt: number | null = null;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // A tab regaining focus is the usual sign somebody came back, so ask then
  // too rather than waiting out the rest of the interval.
  let woken: (() => void) | null = null;
  const wake = () => woken?.();
  window.addEventListener('focus', wake);
  document.addEventListener('visibilitychange', wake);

  try {
    for (;;) {
      if (await isDone()) {
        close(popup);
        return 'connected';
      }
      if (now() - started > timeoutMs) {
        close(popup);
        return 'timeout';
      }
      // One more check after it closes: the grant may have been written just
      // before, and giving up here would report a success as a cancellation.
      if (popup.closed) {
        if (closedAt === null) closedAt = now();
        else if (now() - closedAt > pollMs) return 'cancelled';
      }
      await Promise.race([sleep(pollMs), new Promise<void>((r) => (woken = r))]);
      woken = null;
    }
  } finally {
    window.removeEventListener('focus', wake);
    document.removeEventListener('visibilitychange', wake);
  }
}

/** A popup we opened, so closing it is allowed even cross-origin. */
function close(popup: Window) {
  try {
    if (!popup.closed) popup.close();
  } catch {
    // Already gone, or the browser refused. Nothing to do either way.
  }
}
