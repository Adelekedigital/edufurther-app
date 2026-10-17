/** An account this new, with no session held yet, is greeted "Welcome" (product, 2026-10-17). */
export const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * "Welcome" for a new account (under 7 days old, no completed session), else
 * "Welcome back". An unknown creation date reads as returning.
 */
export function greeting(
  firstName: string,
  createdAt: string | undefined,
  completedSessions: number,
  now: Date,
): string {
  const age = createdAt ? now.getTime() - Date.parse(createdAt) : NaN;
  const isNew = completedSessions === 0 && age < NEW_ACCOUNT_MS;
  return `${isNew ? 'Welcome' : 'Welcome back'}, ${firstName}`;
}
