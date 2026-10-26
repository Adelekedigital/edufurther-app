/**
 * The invite a visitor arrived with (`/invite/{code}`, issue 281), held for
 * the visit until the sign-up flow claims it. sessionStorage: one tab, gone
 * when it closes, and it survives the round trip to Google. Every read and
 * write is guarded: with storage off, the invite is simply not remembered.
 */

const KEY = 'ef-invite-code';

/**
 * A remembered invite lasts an hour: long enough to sign up (Google's round
 * trip included), short enough that a tab left open on a shared computer
 * doesn't hand one visitor's invite to the next.
 */
export const INVITE_CODE_TTL_MS = 60 * 60_000;

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

/** Remember a valid code for this visit; false when it isn't one (nothing is stored). */
export function rememberInviteCode(code: string): boolean {
  if (!isInviteCode(code)) return false;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // Storage off: the visitor signs up without the invite.
  }
  return true;
}

/**
 * The code this visit arrived with in the last hour, or null. A stored value
 * that is malformed, fails the test or is too old is dropped.
 */
export function storedInviteCode(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return null;
    let saved: { code?: unknown; at?: unknown } | null = null;
    try {
      saved = JSON.parse(raw) as { code?: unknown; at?: unknown } | null;
    } catch {
      // Not ours: dropped below.
    }
    const age = typeof saved?.at === 'number' ? Date.now() - saved.at : NaN;
    if (isInviteCode(saved?.code) && age >= 0 && age < INVITE_CODE_TTL_MS) return saved.code;
    sessionStorage.removeItem(KEY);
  } catch {
    // Storage off: no invite.
  }
  return null;
}

export function clearInviteCode() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
