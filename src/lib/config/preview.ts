import type { AppEnv } from '@/lib/copy/preview';

/**
 * The deployment Preview as user names on its chip and in the Read only notice
 * (PRD open question 2: "Staging · Read only" outside production). Every
 * deployment is read only in preview; only the name changes. Unset or unknown
 * reads as production, the strictest wording.
 */
export function appEnv(raw: string | undefined = process.env.NEXT_PUBLIC_APP_ENV): AppEnv {
  return raw === 'staging' || raw === 'development' ? raw : 'production';
}
