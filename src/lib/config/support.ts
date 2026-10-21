/** Used when NEXT_PUBLIC_SUPPORT_EMAIL is unset or isn't an address. */
export const DEFAULT_SUPPORT_EMAIL = 'support@edufurther.org';

/**
 * Where every "Contact support" goes. Config per environment (owner,
 * 2026-10-21), so it is read at call time: tests can set it, and Next inlines
 * it at build (a change needs a rebuild).
 */
export function supportEmail(): string {
  const v = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  // A plain address only: `?`, `&`, `#` or `,` would add headers or recipients to the mailto.
  return v && /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v)
    ? v
    : DEFAULT_SUPPORT_EMAIL;
}
