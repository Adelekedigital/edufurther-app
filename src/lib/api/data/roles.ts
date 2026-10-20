import { ApiError, normaliseError } from './errors';
import { api } from './http';

/**
 * A declined applicant who chose "Continue as a mentee" (owner, 2026-10-18):
 * `primary_role` mentee on a declined profile. They are mentee-side
 * everywhere; the application stays saved for support. Only this pairing
 * reads `primary_role` (decision #17: otherwise a dashboard hint only).
 */
export function menteeByChoice(me: {
  mentor_profile?: { approval_status: string } | null;
  primary_role?: string | null;
}): boolean {
  return me.mentor_profile?.approval_status === 'declined' && me.primary_role === 'mentee';
}

/**
 * The account's role hint (`primary_role`, PATCH /users/{id}/profile). One
 * mutation for every place that sets it: "Continue as a mentee", and a mentor
 * sign-up remembered on the account. It never grants anything (decision #17);
 * it only picks the onboarding and the home.
 */
export async function savePrimaryRole(userId: string, role: 'mentee' | 'mentor'): Promise<void> {
  let r;
  try {
    r = await api.PATCH('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: userId } },
      body: { primary_role: role },
    });
  } catch (e) {
    throw normaliseError(e);
  }
  if (!r.response.ok) throw normaliseError(new ApiError(r.response.status));
}
