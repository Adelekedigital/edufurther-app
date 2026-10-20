import type { SocialKind } from '@/types/mentor';

export type { SocialKind };

/** Each platform's own hosts (backend `domain.social_links`); a website may be anywhere. */
const HOSTS: Record<Exclude<SocialKind, 'website'>, readonly string[]> = {
  linkedin: ['linkedin.com', 'www.linkedin.com'],
  x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  youtube: ['youtube.com', 'www.youtube.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  facebook: ['facebook.com', 'www.facebook.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com'],
};

/**
 * A stored social value → a link we will render, or null. The backend
 * canonicalises these to https URLs (links #507, `social_linkedin` #243), but
 * a profile link is someone else's text on our page, so it is checked here
 * too: https only, no credentials, and on that network's own host (a website
 * on any host). Anything else — a bare handle, another site, `javascript:` —
 * renders nothing.
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
  if (kind === 'website') return url.toString();
  // A platform this build doesn't know yet (a newer backend) renders nothing, rather than throwing.
  const hosts = (HOSTS as Partial<Record<string, readonly string[]>>)[kind];
  if (!hosts?.includes(url.hostname.toLowerCase())) return null;
  return url.toString();
}
