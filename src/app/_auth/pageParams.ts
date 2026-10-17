import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import { parseFailureReason } from './failureReason';

type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : null);

/** What /login and /signup read off their URL; anything unexpected is ignored. */
export function authPageParams(sp: SearchParams, mode: 'login' | 'signup') {
  const rawNext = one(sp.next);
  const reason = parseFailureReason(sp.error);
  return {
    // Log-in has no role: the account decides where they land.
    role:
      mode === 'signup' && one(sp.role) === 'mentor' ? ('mentor' as const) : ('mentee' as const),
    // A next that fails the check is ignored, not replaced: no stray detour.
    next: (rawNext && safeReturnTo(rawNext, '')) || null,
    google:
      one(sp.auth) === 'google'
        ? ('returned' as const)
        : reason === 'google_cancelled' || reason === 'google_failed'
          ? ('failed' as const)
          : undefined,
  };
}
