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

export function readConsentCookie(): ConsentAnswer | null {
  try {
    for (const part of document.cookie.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === CONSENT_COOKIE) return parseConsent(v.join('='));
    }
  } catch {
    // Cookies off: unanswered.
  }
  return null;
}

export function writeConsentCookie(a: ConsentAnswer): void {
  try {
    const domain = cookieDomain(window.location.hostname);
    const secure = window.location.protocol === 'https:';
    document.cookie = [
      `${CONSENT_COOKIE}=${formatConsent(a)}`,
      'Path=/',
      `Max-Age=${MAX_AGE_S}`,
      'SameSite=Lax',
      ...(domain ? [`Domain=${domain}`] : []),
      ...(secure ? ['Secure'] : []),
    ].join('; ');
  } catch {
    // Cookies off: the answer holds for this page only (the store has it).
  }
}

/** The account's stored answer (`/me` analytics_consent), as an answer. */
export function fromServer(
  c: { granted: boolean; version: string; answered_at: string } | null | undefined,
): ConsentAnswer | null {
  if (!c) return null;
  const at = Date.parse(c.answered_at);
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
