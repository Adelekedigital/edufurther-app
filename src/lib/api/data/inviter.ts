import type { components } from '@/lib/api/generated/schema';
import { publicPhoto } from '@/lib/utils/publicPhoto';

/**
 * Who sent an invite, as GET /invites/{code} tells a signed-out visitor
 * (InviteLookupRead): shared by the browser hooks (invite.ts) and the
 * server-drawn link preview (opengraph-image), so neither builds its own.
 */
/** Who sent the invite, as much as a signed-out page may show (InviterRead). */
export type Inviter = { firstName: string; photoUrl: string | null };

/** No first name, no line: the sign-in page can't say who invited them. */
export function toInviter(r: components['schemas']['InviteLookupRead']): Inviter | null {
  const first = r.inviter?.first_name?.trim();
  if (!first) return null;
  return { firstName: first, photoUrl: publicPhoto(r.inviter?.avatar_url) };
}
