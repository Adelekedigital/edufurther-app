import type { SocialKind } from '@/types/mentor';

export type { SocialKind };

const HOSTS: Record<SocialKind, readonly string[]> = {
  linkedin: ['linkedin.com', 'www.linkedin.com'],
  x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  youtube: ['youtube.com', 'www.youtube.com'],
};

/**
 * A stored social value → a link we will render, or null. The backend
 * canonicalises these to https URLs on that network (mentor-profile reply,
 * #243), but a profile link is someone else's text on our page, so it is
 * checked here too: https only, on that network's own host. Anything else —
 * a bare handle, another site, `javascript:` — renders nothing.
 */
export function safeSocialUrl(kind: SocialKind, value: string | null | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  if (!HOSTS[kind].includes(url.hostname.toLowerCase())) return null;
  return url.toString();
}
