/**
 * Why a sign-in sent the visitor back to /login. Shared by the callback route
 * (which decides it) and the login page (which reads it back off the URL).
 */
export const FAILURE_REASONS = ['link', 'google_cancelled', 'google_failed'] as const;

export type AuthFailureReason = (typeof FAILURE_REASONS)[number];

/** Only our own reasons; anything else in the URL is ignored. */
export function parseFailureReason(value: unknown): AuthFailureReason | undefined {
  return FAILURE_REASONS.find((r) => r === value);
}

/**
 * Which way in failed. The flow says so itself, through `from` on the callback
 * URL, because the error codes cannot be trusted to: Supabase answers an
 * expired or reused email link with `access_denied` as well, and telling
 * someone their Google sign-in was cancelled when their link expired loses the
 * one thing that would have helped them — the 6-digit code.
 *
 * It also covers the case with no `error` at all: a Google round trip whose
 * code came back but would not exchange (a dropped verifier cookie, or Back
 * onto the callback reusing a one-time code) is a Google failure, not a link.
 */
export function failureReason(params: URLSearchParams): AuthFailureReason {
  if (params.get('from') !== 'google') return 'link';
  return params.get('error') === 'access_denied' ? 'google_cancelled' : 'google_failed';
}
