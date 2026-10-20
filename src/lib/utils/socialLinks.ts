import type { SocialKind, SocialMark } from '@/types/mentor';

/**
 * Settings › Social links' platforms, in the design's order (Mentor
 * Settings.dc.html `P`): what each is called, the prefix its field shows and
 * its placeholder. LinkedIn is `social_linkedin` on the profile; the rest are
 * the user's links (backend LinkPlatform, #507).
 */
export const SOCIAL_PLATFORMS: readonly {
  kind: SocialKind;
  label: string;
  prefix: string;
  placeholder: string;
}[] = [
  { kind: 'linkedin', label: 'LinkedIn', prefix: 'linkedin.com/in/', placeholder: 'your-name' },
  { kind: 'x', label: 'X', prefix: 'x.com/', placeholder: 'handle' },
  { kind: 'youtube', label: 'YouTube', prefix: 'youtube.com/@', placeholder: 'channel' },
  { kind: 'instagram', label: 'Instagram', prefix: 'instagram.com/', placeholder: 'handle' },
  { kind: 'facebook', label: 'Facebook', prefix: 'facebook.com/', placeholder: 'page-or-name' },
  { kind: 'tiktok', label: 'TikTok', prefix: 'tiktok.com/@', placeholder: 'handle' },
  { kind: 'website', label: 'Website', prefix: 'https://', placeholder: 'yoursite.com' },
];

/** Websites a user may add; the fourth is a 409 (backend `/problems/website-limit-reached`). */
export const WEBSITE_MAX = 3;

const MARK_LABELS: Record<SocialMark, string> = {
  linkedin: 'LinkedIn',
  x: 'X',
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  website: 'Website',
  medium: 'Medium',
  substack: 'Substack',
};
export const markLabel = (mark: SocialMark) => MARK_LABELS[mark];

// ---- LinkedIn ---------------------------------------------------------------

/**
 * A LinkedIn profile link, as the backend reads it: linkedin.com or its www,
 * m or two-letter country host, then /in/<handle>. Anything after the handle
 * (…/details/experience) is dropped, as the backend does.
 */
const LINKEDIN =
  /^(?:https?:\/\/)?(?:(?:www|m|[a-z]{2})\.)?linkedin\.com\/in\/([^/?#\s]+)(?:\/[^?#\s]*)?(?:[?#].*)?$/i;

/** LinkedIn's own 3–100 characters: letters, digits, marks (not first), _ and -. */
const LINKEDIN_HANDLE = /^(?!\p{M})[\p{L}\p{Nd}\p{Mn}\p{Mc}_-]{3,100}$/u;

/**
 * A handle as the backend reads it: percent-decoded once as UTF-8 (LinkedIn
 * encodes accented names), then NFKC. Null when it isn't one.
 */
function linkedInSlug(raw: string): string | null {
  let handle: string;
  try {
    handle = decodeURIComponent(raw);
  } catch {
    return null;
  }
  // A % left after one decode was encoded twice: the backend refuses it.
  if (handle.includes('%')) return null;
  handle = handle.normalize('NFKC');
  return LINKEDIN_HANDLE.test(handle) ? handle : null;
}

/** The handle in a LinkedIn profile link; null when it isn't one. */
export function linkedInHandle(url: string): string | null {
  const raw = LINKEDIN.exec(url.trim())?.[1];
  return raw ? linkedInSlug(raw) : null;
}

/** Saved as the backend stores it (UTF-8, uppercase hex), so the link always opens. */
export const linkedInUrl = (handle: string) =>
  `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;

// ---- Drafts -------------------------------------------------------------------

/**
 * A full link to each platform, on one of its own hosts (backend
 * `domain.social_links`): the handle it names; any further path, query or
 * fragment drops, as the backend's does. A whole link only, so typing isn't cut short.
 */
const LINK_FORMS: Partial<Record<SocialKind, RegExp>> = {
  x: /^(?:https?:\/\/)?(?:(?:www|mobile)\.)?(?:x|twitter)\.com\/@?([^/?#\s]+)(?:[/?#].*)?$/i,
  youtube: /^(?:https?:\/\/)?(?:(?:www|m)\.)?youtube\.com\/@([^/?#\s]+)(?:[/?#].*)?$/i,
  instagram: /^(?:https?:\/\/)?(?:(?:www|m)\.)?instagram\.com\/([^/?#\s]+)(?:[/?#].*)?$/i,
  facebook: /^(?:https?:\/\/)?(?:(?:www|m|web)\.)?facebook\.com\/([^/?#\s]+)(?:[/?#].*)?$/i,
  tiktok: /^(?:https?:\/\/)?(?:(?:www|m)\.)?tiktok\.com\/@([^/?#\s]+)(?:[/?#].*)?$/i,
};
const FACEBOOK_ID =
  /^(?:(?:https?:\/\/)?(?:(?:www|m|web)\.)?facebook\.com\/)?profile\.php\?id=(\d{1,20})(?:&.*)?$/i;

/**
 * What the field keeps as it changes: a pasted or typed full link becomes its
 * handle (the design's `strip`: "You can paste the full link too"), and a
 * leading "@" goes. Anything else is left as typed.
 */
export function tidyDraft(kind: SocialKind, raw: string): string {
  if (kind === 'website') return raw.replace(/^\s+/, '');
  if (kind === 'linkedin') return linkedInHandle(raw) ?? raw.replace(/^@/, '');
  if (kind === 'facebook') {
    const id = FACEBOOK_ID.exec(raw.trim())?.[1];
    if (id) return `profile.php?id=${id}`;
  }
  const hit = LINK_FORMS[kind]?.exec(raw.trim())?.[1];
  return hit ?? raw.replace(/^@/, '');
}

/** Words a platform keeps for itself, never a handle (backend reserved lists). */
const RESERVED: Partial<Record<SocialKind, readonly string[]>> = {
  x: [
    'home',
    'i',
    'intent',
    'share',
    'search',
    'explore',
    'settings',
    'messages',
    'notifications',
    'hashtag',
    'login',
    'signup',
    'tos',
    'privacy',
    'compose',
  ],
  instagram: ['p', 'reel', 'reels', 'explore', 'stories', 'accounts', 'direct', 'tv', 'about'],
  facebook: [
    'pages',
    'groups',
    'events',
    'watch',
    'marketplace',
    'share',
    'login',
    'home.php',
    'people',
    'profile.php',
    'permalink.php',
    'story.php',
    'photo.php',
    'gaming',
    'help',
    'settings',
  ],
};

/** Each platform's handle, as the backend accepts it (its 422 decides the rest). */
const HANDLES: Record<Exclude<SocialKind, 'website' | 'linkedin'>, RegExp> = {
  x: /^[A-Za-z0-9_]{1,15}$/,
  youtube: /^[A-Za-z0-9_.-]{3,30}$/,
  instagram: /^(?!\.)[A-Za-z0-9._]{1,30}(?<!\.)$/,
  facebook: /^(?:[A-Za-z0-9.]{5,50}|profile\.php\?id=\d{1,20})$/,
  tiktok: /^[A-Za-z0-9._]{2,24}(?<!\.)$/,
};

/** A website's host, as the backend checks it: a dot, and a 2–63 character last label. */
const HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/i;

/**
 * Why a draft can't be saved yet, or null. `shape`: spaces or slashes in a
 * handle (the design's rule and note); `handle`: not that platform's handle;
 * `website`: not a web address. An empty draft has no problem to show.
 */
export function draftProblem(
  kind: SocialKind,
  value: string,
): 'shape' | 'handle' | 'website' | null {
  const v = value.trim();
  if (!v) return null;
  if (kind === 'website') {
    if (/\s/.test(v)) return 'website';
    const scheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(v)?.[1];
    if (scheme && !/^https?$/i.test(scheme)) return 'website';
    const host = v.replace(/^https?:\/\//i, '').split(/[/?#]/)[0]!;
    if (host.includes('@') || host.includes(':')) return 'website';
    // An internationalised name (café.fr) is checked as the backend does: its IDNA form.
    let ascii = host;
    try {
      ascii = new URL(`https://${host}`).hostname;
    } catch {
      return 'website';
    }
    return HOST.test(ascii) ? null : 'website';
  }
  if (kind === 'linkedin') {
    if (/[\s/]/.test(v)) return 'shape';
    return linkedInSlug(v) ? null : 'handle';
  }
  if (/[\s/]/.test(v)) return 'shape';
  if (RESERVED[kind]?.includes(v.toLowerCase())) return 'handle';
  return HANDLES[kind].test(v) ? null : 'handle';
}

/**
 * A website draft that is really one of the platforms (the design's DETECT):
 * "Looks like Medium. We’ll show its icon." Null for any other site.
 */
export function detectSite(value: string): SocialMark | null {
  const v = value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '');
  const host = v.split(/[/?#]/)[0]!.toLowerCase();
  if (/(^|\.)medium\.com$/.test(host)) return 'medium';
  if (/(^|\.)substack\.com$/.test(host)) return 'substack';
  if (/(^|\.)linkedin\.com$/.test(host) && /\/in\//i.test(v)) return 'linkedin';
  if (/(^|\.)(x|twitter)\.com$/.test(host)) return 'x';
  if (/(^|\.)youtube\.com$/.test(host)) return 'youtube';
  if (/(^|\.)instagram\.com$/.test(host)) return 'instagram';
  if (/(^|\.)facebook\.com$/.test(host)) return 'facebook';
  if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok';
  return null;
}

// ---- Showing a saved link -------------------------------------------------

/** A website on Medium or Substack shows their mark; everything else its own. */
export function markOf(kind: SocialKind, url: string): SocialMark {
  if (kind !== 'website') return kind;
  const site = detectSite(url);
  return site === 'medium' || site === 'substack' ? site : 'website';
}

/** The link as a row shows it: no scheme, no www, no trailing slash. */
export const displayUrl = (url: string) =>
  url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
