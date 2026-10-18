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
