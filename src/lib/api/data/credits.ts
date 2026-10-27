import type { components } from '@/lib/api/generated/schema';
import type { Viewer } from '@/types/mentor';

/** A mentee's credit block as the app holds it (shell, explainer, admin Credits). */
export type Credits = NonNullable<Extract<Viewer, { kind: 'member' }>['credits']>;

/**
 * `CreditsRead` → `Credits`. The one mapper for the block: `/me` and the admin
 * mentee reads return the same shape from the same backend reader.
 */
export function toCredits(c: components['schemas']['CreditsRead']): Credits {
  return {
    balance: c.balance,
    state: c.state,
    nextResetAt: c.next_reset_at ?? null,
    monthly: {
      balance: c.monthly.balance,
      ceiling: c.monthly.ceiling,
      expiresAt: c.monthly.expires_at,
      unlocked: c.monthly.unlocked,
    },
    bonus: {
      balance: c.bonus.balance,
      groups: c.bonus.groups.map((g) => ({ count: g.count, expiresAt: g.expires_at })),
    },
  };
}
