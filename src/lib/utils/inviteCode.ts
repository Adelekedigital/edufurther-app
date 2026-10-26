/**
 * The invite a visitor arrived with (`/invite/{code}`, issue 281), held for
 * the visit until the sign-up flow claims it. sessionStorage: one tab, gone
 * when it closes, and it survives the round trip to Google. Every read and
 * write is guarded: with storage off, the invite is simply not remembered.
 */

const KEY = 'ef-invite-code';

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
    sessionStorage.setItem(KEY, code);
  } catch {
    // Storage off: the visitor signs up without the invite.
  }
  return true;
}

/** The code this visit arrived with, or null. A stored value that fails the test is dropped. */
export function storedInviteCode(): string | null {
  try {
    const code = sessionStorage.getItem(KEY);
    if (code === null) return null;
    if (isInviteCode(code)) return code;
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
