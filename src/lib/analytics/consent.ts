/**
 * The analytics consent answer (PRD 30), asked once across the app and the
 * landing site: one cookie on `.edufurther.org`, which both read and write.
 *
 *   ef_consent=<version>.<1|0>.<unix seconds>
 *
 * `version` names the consent text that was answered; an answer to another
 * version is no answer (the banner asks again). The time lets the newest of
 * the cookie and the account's stored answer win. Nothing else is in it: no
 * id, no name.
 */

/** The consent text in force. Change it when the banner's words change in substance. */
export const CONSENT_VERSION = '2026-11-10';

export const CONSENT_COOKIE = 'ef_consent';

/** Twelve months, then asked again. */
const MAX_AGE_S = 365 * 24 * 60 * 60;

export type ConsentAnswer = { granted: boolean; version: string; answeredAt: number };

const SHAPE = /^([A-Za-z0-9-]{1,32})\.([01])\.(\d{1,12})$/;

/** A cookie value, or null when it isn't one of ours. */
export function parseConsent(raw: string | null | undefined): ConsentAnswer | null {
  if (!raw) return null;
  const m = SHAPE.exec(raw);
  if (!m) return null;
  return { version: m[1]!, granted: m[2] === '1', answeredAt: Number(m[3]) * 1000 };
}

export function formatConsent(a: ConsentAnswer): string {
  return `${a.version}.${a.granted ? '1' : '0'}.${Math.floor(a.answeredAt / 1000)}`;
}

/** An answer to the consent text in force; any other is treated as unanswered. */
export function isCurrent(a: ConsentAnswer | null): a is ConsentAnswer {
  return a !== null && a.version === CONSENT_VERSION;
}

/**
 * The cookie's domain: `.edufurther.org` on that site and its subdomains, so
 * the landing site reads the same answer; host-only anywhere else (localhost,
 * a Vercel preview URL).
 */
export function cookieDomain(host: string): string | null {
  const h = host.toLowerCase();
  return h === 'edufurther.org' || h.endsWith('.edufurther.org') ? '.edufurther.org' : null;
}

function readCookie(name: string): string | null {
  try {
    for (const part of document.cookie.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === name) return v.join('=');
    }
  } catch {
    // Cookies off: nothing.
  }
  return null;
}

function writeCookie(name: string, value: string): void {
  try {
    const domain = cookieDomain(window.location.hostname);
    const secure = window.location.protocol === 'https:';
    document.cookie = [
      `${name}=${value}`,
      'Path=/',
      `Max-Age=${MAX_AGE_S}`,
      'SameSite=Lax',
      ...(domain ? [`Domain=${domain}`] : []),
      ...(secure ? ['Secure'] : []),
    ].join('; ');
  } catch {
    // Cookies off: held for this page only.
  }
}

/** The device's answer. A time ahead of this device's clock is read as now. */
export function readConsentCookie(now = Date.now()): ConsentAnswer | null {
  const a = parseConsent(readCookie(CONSENT_COOKIE));
  return a && { ...a, answeredAt: Math.min(a.answeredAt, now) };
}

export function writeConsentCookie(a: ConsentAnswer): void {
  writeCookie(CONSENT_COOKIE, formatConsent(a));
}

/**
 * The last log-out on this device (PRD 30, shared device): an answer given
 * before it was someone else's, so it counts as unanswered (the banner asks
 * again, nothing is sent to the next account). Only a time, beside the answer.
 */
export const SIGNED_OUT_COOKIE = 'ef_consent_out';

/** In milliseconds, so no rounding either way can misplace an answer around a sign-out. */
export function markSignedOut(now = Date.now()): void {
  writeCookie(SIGNED_OUT_COOKIE, String(Math.floor(now)));
}

export function readSignedOut(now = Date.now()): number | null {
  const raw = readCookie(SIGNED_OUT_COOKIE);
  if (!raw || !/^\d{1,15}$/.test(raw)) return null;
  return Math.min(Number(raw), now);
}

/** The device's answer, unless it predates the last log-out here. */
export function stillValid(
  a: ConsentAnswer | null,
  signedOutAt: number | null,
): ConsentAnswer | null {
  return a && (signedOutAt === null || a.answeredAt > signedOutAt) ? a : null;
}

/** The account's stored answer (`/me` analytics_consent), as an answer. */
export function fromServer(
  c: { granted: boolean; version: string; answeredAt: string } | null | undefined,
): ConsentAnswer | null {
  if (!c) return null;
  const at = Date.parse(c.answeredAt);
  return { granted: c.granted, version: c.version, answeredAt: Number.isNaN(at) ? 0 : at };
}

/**
 * What a member's device should hold, from the cookie and the account's
 * answer: the newest current one wins. `push` is true when the cookie is
 * newer than the account (an answer on the landing site, or before sign-in),
 * so the account is told; `write` when the account is newer than the cookie.
 */
export function reconcile(
  cookie: ConsentAnswer | null,
  server: ConsentAnswer | null,
): { answer: ConsentAnswer | null; push: boolean; write: boolean } {
  const c = isCurrent(cookie) ? cookie : null;
  const s = isCurrent(server) ? server : null;
  if (!c && !s) return { answer: null, push: false, write: false };
  if (c && (!s || c.answeredAt > s.answeredAt))
    return { answer: c, push: !s || s.granted !== c.granted, write: false };
  return { answer: s, push: false, write: !c || c.granted !== s!.granted };
}

/**
 * The answer in force, for the analytics root and Settings alike: one given
 * on this page wins; otherwise the device's (unless it predates the last
 * log-out here) and, for a member, the account's, newest first.
 */
export function effectiveConsent(i: {
  stored: ConsentAnswer | null;
  here: boolean;
  signedOutAt: number | null;
  /** A member's `/me` answer; undefined for a guest. */
  server?: { granted: boolean; version: string; answeredAt: string } | null;
  member: boolean;
}): { answer: ConsentAnswer | null; push: boolean; write: boolean } {
  if (i.here) return { answer: i.stored, push: false, write: false };
  const device = stillValid(i.stored, i.signedOutAt);
  if (!i.member) return { answer: device, push: false, write: false };
  return reconcile(device, fromServer(i.server));
}
