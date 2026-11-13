import createClient from 'openapi-fetch';
import type { components, paths } from '@/lib/api/generated/schema';
import { proxySecretHeaders } from '@/lib/backend';
import { coverKey, type CoverKey } from '@/lib/utils/cover';
import { personCover, personInitials } from '@/lib/utils/person';
import { inviterPhoto } from './inviter';
import { PREVIEW_LOOKUP_TIMEOUT_MS } from './inviteServer';
import { serverBackend } from './serverBackend';

/**
 * A crawler sees the same preview for an hour: the image and the og: lines stay
 * cached (Vercel cost rules), and a mentor who hides their profile drops out
 * of new previews within the hour.
 */
export const MENTOR_PREVIEW_REVALIDATE_S = 3600;

/** What a mentor's link preview shows: only what the public profile shows. */
export type MentorPreview = {
  id: string;
  name: string;
  initials: string;
  cover: CoverKey;
  /** Only from our image host (`inviterPhoto`), else the initials. */
  photoUrl: string | null;
  headline: string | null;
  school: string | null;
  topics: string[];
};

/** No name, no preview: the generic one reads better than "EduFurther mentor". */
export function toMentorPreview(
  r: components['schemas']['MentorPublicRead'],
): MentorPreview | null {
  const first = r.first_name?.trim() || '';
  const last = r.last_name?.trim() || '';
  const name = [first, last].filter(Boolean).join(' ');
  if (!name) return null;
  return {
    id: r.id,
    name,
    initials: personInitials(first, last, name),
    cover: personCover(r.id, coverKey(r.cover_color)),
    photoUrl: inviterPhoto(r.avatar_url),
    headline: r.headline?.trim() || null,
    school: r.education?.[0]?.institution?.trim() || null,
    topics: (r.offerings ?? []).map((o) => o.display_name).filter(Boolean),
  };
}

/**
 * Server-only: a mentor's public profile, for the link preview. The same
 * GET /mentors/{handle} a guest's page calls, with no token, so a hidden or
 * unapproved profile is a 404 here even for its owner. Null for that or any
 * failure: the preview then draws the generic one, never an error.
 */
export async function lookupMentorPreviewOnServer(
  handle: string,
  origin: string,
): Promise<MentorPreview | null> {
  if (!handle || handle.length > 200 || handle.includes('/')) return null;
  const target = serverBackend(origin);
  if (!target) return null;
  const api = createClient<paths>({ baseUrl: target.base });
  try {
    const { data } = await api.GET('/api/v1/mentors/{handle}', {
      params: { path: { handle } },
      headers: target.mock ? {} : proxySecretHeaders(),
      next: { revalidate: MENTOR_PREVIEW_REVALIDATE_S },
      signal: AbortSignal.timeout(PREVIEW_LOOKUP_TIMEOUT_MS),
    });
    return data ? toMentorPreview(data) : null;
  } catch {
    return null;
  }
}
