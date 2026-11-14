import type { components } from '@/lib/api/generated/schema';
import { coverKey, type CoverKey } from '@/lib/utils/cover';
import { personCover, personInitials } from '@/lib/utils/person';
import { publicPhoto } from '@/lib/utils/publicPhoto';
import { serverRead } from './serverBackend';

/**
 * How long a preview is reused, for both the profile read (Data Cache) and the
 * drawn image (ISR). The two stack: an image drawn just before the read
 * expires can show it for another window, so a mentor who hides their profile
 * leaves new previews within about an hour (2 × 30 min). Vercel cost rules:
 * a crawler hit never redraws. Chat apps keep their own copy for longer.
 */
export const MENTOR_PREVIEW_REVALIDATE_S = 1800;

/** The read's cache tag, so a hide can be revalidated once the backend can call us. */
export const mentorPreviewTag = (handle: string) => `mentor-preview:${handle}`;

/**
 * A slug (letters, digits, `-`, `_`) or an id (a UUID is the same shape). The
 * handle goes into the request path, so `.`, `..`, slashes and anything
 * percent-decoded never reach the origin-locked backend.
 */
const HANDLE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
export const isMentorHandle = (handle: string) => HANDLE.test(handle);

/** What a mentor's link preview shows: only what the public profile shows. */
export type MentorPreview = {
  id: string;
  name: string;
  initials: string;
  cover: CoverKey;
  /** Only from our own storage (`publicPhoto`), else the initials. */
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
    photoUrl: publicPhoto(r.avatar_url),
    headline: r.headline?.trim() || null,
    school: r.education?.[0]?.institution?.trim() || null,
    topics: (r.offerings ?? []).map((o) => o.display_name).filter(Boolean),
  };
}

/**
 * Server-only: a mentor's public profile, for the link preview. The same
 * GET /mentors/{handle} a guest's page calls, with no token, so a hidden or
 * unapproved profile is a 404 here even for its owner. Null for that, a
 * handle of the wrong shape, or any failure: the preview is the generic one.
 */
export async function lookupMentorPreviewOnServer(
  handle: string,
  origin: string,
): Promise<MentorPreview | null> {
  if (!isMentorHandle(handle)) return null;
  const data = await serverRead(origin, (api, init) =>
    api.GET('/api/v1/mentors/{handle}', {
      params: { path: { handle } },
      ...init,
      next: { revalidate: MENTOR_PREVIEW_REVALIDATE_S, tags: [mentorPreviewTag(handle)] },
    }),
  );
  return data ? toMentorPreview(data) : null;
}
