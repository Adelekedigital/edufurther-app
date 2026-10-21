/** Used when NEXT_PUBLIC_SUPPORT_EMAIL is unset or isn't an address. */
export const DEFAULT_SUPPORT_EMAIL = 'support@edufurther.org';

/**
 * Where every "Contact support" goes. Config per environment (owner,
 * 2026-10-21), so it is read at call time: tests can set it, and Next inlines
 * it at build.
 */
export function supportEmail(): string {
  const v = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return v && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(v) ? v : DEFAULT_SUPPORT_EMAIL;
}
