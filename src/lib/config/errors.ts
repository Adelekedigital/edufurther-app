/**
 * Error tracking (error-tracking trial PRD, owner 2026-11-11), off by default:
 * - NEXT_PUBLIC_SENTRY_ENABLED='true' turns Sentry on;
 * - NEXT_PUBLIC_SENTRY_DSN names the project. It is public by design (it only
 *   lets someone send events to it), and without it nothing loads.
 * The source-map token (SENTRY_AUTH_TOKEN) is build-only, never NEXT_PUBLIC_.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ?? '';
// Whether it is on is spelled out where it's used (lib/vendor/errors `on`),
// not exported from here: the build folds an inline process.env check, so with
// the flag off Sentry's import is dead code and never emitted.

/** Same-origin path the browser sends through, so ad blockers don't drop errors. */
export const SENTRY_TUNNEL_PATH = '/api/monitoring';

/** The deployment's commit (Vercel system variable, read at build time). */
export const ERRORS_RELEASE = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined;

/**
 * Set it per deployment: the testing site is a Vercel *production* deployment
 * on test data, and the trial scores live traffic only (owner, 11 Nov), so
 * Vercel's own environment name can't tell them apart.
 */
export const ERRORS_ENVIRONMENT =
  process.env.NEXT_PUBLIC_ERRORS_ENVIRONMENT?.trim() ||
  process.env.NEXT_PUBLIC_VERCEL_ENV ||
  'development';
