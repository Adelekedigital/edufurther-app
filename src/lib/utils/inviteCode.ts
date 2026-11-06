/**
 * The invite a visitor arrived with (`/invite/{code}`, issue 281), held on
 * this device until a new account claims it (the sign-up page, or the guest
 * booking sign-in). localStorage (PRD Invite Landing): it outlives the tab, so
 * a friend who closes the link and signs up days later still arrives through
 * it; the latest valid link wins. Every read and write is guarded: with
 * storage off, the invite is simply not remembered.
 */

const KEY = 'ef-invite-code';

/**
 * A remembered invite lasts 30 days (PRD Invite Landing, attribution): long
 * enough to come back and sign up later, and cleared after any claim attempt,
 * so only a brand-new account on this device can ever use it.
 */
export const INVITE_CODE_TTL_MS = 30 * 24 * 60 * 60_000;

/** The backend's longest code (`MAX_CODE_LENGTH`), for a lookup or a claim. */
export const MAX_INVITE_CODE_LENGTH = 128;

/**
 * The backend's own test (`is_plausible_code`): 1 to 128 URL-safe characters.
 * Picked handles are lowercase letters, digits and single hyphens, but a
 * single-use invite's code is `token_urlsafe` output (mixed case, `_`), and it
 * travels by the same `/invite/{code}` link, so both must pass. Nothing else
 * is ever stored, sent or shown.
 */
const PLAUSIBLE = /^[A-Za-z0-9_-]+$/;

export function isInviteCode(code: unknown): code is string {
  return (
    typeof code === 'string' &&
    code.length > 0 &&
    code.length <= MAX_INVITE_CODE_LENGTH &&
    PLAUSIBLE.test(code)
  );
}

/** Remember a valid code, replacing any older one; false when it isn't one (nothing is stored). */
export function rememberInviteCode(code: string): boolean {
  if (!isInviteCode(code)) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // Storage off: the visitor signs up without the invite.
  }
  return true;
}

/**
 * The code this device last arrived with, within INVITE_CODE_TTL_MS, or null. A stored value
 * that is malformed, fails the test or is too old is dropped.
 */
export function storedInviteCode(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    let saved: { code?: unknown; at?: unknown } | null = null;
    try {
      saved = JSON.parse(raw) as { code?: unknown; at?: unknown } | null;
    } catch {
      // Not ours: dropped below.
    }
    const age = typeof saved?.at === 'number' ? Date.now() - saved.at : NaN;
    if (isInviteCode(saved?.code) && age >= 0 && age < INVITE_CODE_TTL_MS) return saved.code;
    localStorage.removeItem(KEY);
  } catch {
    // Storage off: no invite.
  }
  return null;
}

export function clearInviteCode() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
