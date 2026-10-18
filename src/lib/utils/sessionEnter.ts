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

export function enterPath(sessionId: string): string {
  return `/sessions/${encodeURIComponent(sessionId)}/enter`;
}

/** The query parameter the route sends the page back with when it couldn't open the call. */
export const ENTER_PARAM = 'enter';

export const ENTER_PROBLEMS = ['nolink', 'closed', 'notopen', 'failed'] as const;
export type EnterProblem = (typeof ENTER_PROBLEMS)[number];

export function isEnterProblem(value: string | null | undefined): value is EnterProblem {
  return !!value && (ENTER_PROBLEMS as readonly string[]).includes(value);
}
