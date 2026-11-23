/**
 * Join and Rejoin are a link to our own route, `/sessions/{id}/enter`, which
 * records the arrival on the server and redirects to the call (#207, ADR 0009).
 * Shared by the proxy (which forwards the token to that path only), the route,
 * and the session page.
 */

/**
 * A session id the route acts on: UUIDs on the real backend, short ids in the
 * mock. No dot on purpose: the proxy's matcher skips paths with a dot, and the
 * route must never act on a request the proxy didn't clean.
 */
export const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** The one path, exactly, that gets the access token besides `/`. */
const ENTER_PATH = /^\/sessions\/[A-Za-z0-9_-]{1,128}\/enter$/;

export function isEnterPath(pathname: string): boolean {
  return ENTER_PATH.test(pathname);
}

/**
 * `inSafari`: the installed app on iOS asks the route to hand a Google Meet
 * call to Safari proper (ADR 0013). It only asks; the route decides.
 */
export function enterPath(sessionId: string, { inSafari = false } = {}): string {
  const path = `/sessions/${encodeURIComponent(sessionId)}/enter`;
  return inSafari ? `${path}?${OPEN_PARAM}=${OPEN_IN_SAFARI}` : path;
}

/** The query parameter, and its one value, that ask for the Safari hand-off. */
export const OPEN_PARAM = 'open';
export const OPEN_IN_SAFARI = 'safari';

/** The one host the hand-off is for. Daily, Zoom and custom links never take it. */
const MEET_HOST = 'meet.google.com';

/**
 * The server's own Meet link as `x-safari-https://…`, which iOS 17+ opens in
 * Safari (signed in, and the Meet app can take over) rather than the
 * installed app's in-app sheet (ADR 0013). Null for anything that isn't
 * exactly an https link on meet.google.com: the caller then redirects as
 * usual. Only ever given the backend's link, never anything from the request.
 */
export function safariHandoff(callUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(callUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== MEET_HOST) return null;
  if (url.username || url.password || url.port) return null;
  return `x-safari-${url.href}`;
}

/**
 * Where the video call sends a mentee when they leave it (Daily's exit
 * redirect, set by the backend): `?from=call`, so the review can open by itself.
 */
export const FROM_PARAM = 'from';
export const FROM_CALL = 'call';

/** The query parameter the route sends the page back with when it couldn't open the call. */
export const ENTER_PARAM = 'enter';

export const ENTER_PROBLEMS = ['nolink', 'closed', 'notopen', 'failed'] as const;
export type EnterProblem = (typeof ENTER_PROBLEMS)[number];

export function isEnterProblem(value: string | null | undefined): value is EnterProblem {
  return !!value && (ENTER_PROBLEMS as readonly string[]).includes(value);
}
