import type { components } from '@/lib/api/generated/schema';

/**
 * Who sent an invite, as GET /invites/{code} tells a signed-out visitor
 * (InviteLookupRead): shared by the browser hooks (invite.ts) and the
 * server-drawn link preview (opengraph-image), so neither builds its own.
 */
/** Who sent the invite, as much as a signed-out page may show (InviterRead). */
export type Inviter = { firstName: string; photoUrl: string | null };

/**
 * A photo shown to a signed-out visitor loads only from our image host
 * (https, `*.supabase.co`, as next.config's `remotePatterns`): any other URL
 * could count who opens an invite. Anything else shows the initials.
 */
export function inviterPhoto(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith('.supabase.co') ? url : null;
  } catch {
    return null;
  }
}

/** No first name, no line: the sign-in page can't say who invited them. */
export function toInviter(r: components['schemas']['InviteLookupRead']): Inviter | null {
  const first = r.inviter?.first_name?.trim();
  if (!first) return null;
  return { firstName: first, photoUrl: inviterPhoto(r.inviter?.avatar_url) };
}
