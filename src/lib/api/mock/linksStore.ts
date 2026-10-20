import type { components } from '@/lib/api/generated/schema';
import { draftProblem, linkedInHandle, linkedInUrl, tidyDraft } from '@/lib/utils/socialLinks';

type LinkRead = components['schemas']['LinkRead'];
type LinkPlatform = components['schemas']['LinkPlatform'];

/** Each platform's canonical link (backend `domain.social_links`). */
const CANONICAL: Record<Exclude<LinkPlatform, 'website'>, string> = {
  x: 'https://x.com/',
  youtube: 'https://www.youtube.com/@',
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  tiktok: 'https://www.tiktok.com/@',
};

/**
 * MOCK store for the viewer's social links (backend #507) and LinkedIn
 * (`social_linkedin`), one set for the mock viewer whichever role it plays.
 * The mock mentor starts with LinkedIn and a YouTube channel, as the design
 * draws. In memory: a restart starts over.
 */
const store: { linkedin: string | null; links: LinkRead[] } = {
  linkedin: 'https://www.linkedin.com/in/ada-obi',
  links: [
    {
      id: '6f0e1c2a-0000-4000-8000-000000000001',
      platform: 'youtube',
      value: 'gradpathwithada',
      url: 'https://www.youtube.com/@gradpathwithada',
      position: 0,
    },
  ],
};

export const mockLinkedIn = () => store.linkedin;
export const mockLinks = () => [...store.links].sort((a, b) => a.position - b.position);

/** `social_linkedin` from a profile PATCH: null clears; anything else must be a profile. */
export function setMockLinkedIn(v: unknown): boolean {
  if (v === null || v === '') {
    store.linkedin = null;
    return true;
  }
  const handle = typeof v === 'string' ? linkedInHandle(v) : null;
  if (!handle) return false;
  store.linkedin = linkedInUrl(handle);
  return true;
}

/** The backend's canonical form of a value, or null where it answers 422 at /value. */
function canonical(platform: LinkPlatform, raw: string): { value: string; url: string } | null {
  const v = tidyDraft(platform, raw).trim();
  if (!v || draftProblem(platform, v)) return null;
  if (platform === 'website') {
    const site = v.replace(/^https?:\/\//i, '').replace(/#.*$/, '');
    return { value: site, url: `https://${site}` };
  }
  return { value: v, url: CANONICAL[platform] + v };
}

export type MockLinkResult =
  { ok: true; link: LinkRead } | { ok: false; status: 404 | 409 | 422; type?: string };

export function addMockLink(platform: LinkPlatform, value: string): MockLinkResult {
  if (platform === 'website') {
    if (store.links.filter((l) => l.platform === 'website').length >= 3)
      return { ok: false, status: 409, type: '/problems/website-limit-reached' };
  } else if (store.links.some((l) => l.platform === platform))
    return { ok: false, status: 409, type: '/problems/link-platform-taken' };
  const c = canonical(platform, value);
  if (!c) return { ok: false, status: 422 };
  const link: LinkRead = {
    id: crypto.randomUUID(),
    platform,
    ...c,
    // Appended: max(position) + 1, gaps and all, as the backend does.
    position: Math.max(-1, ...store.links.map((l) => l.position)) + 1,
  };
  store.links.push(link);
  return { ok: true, link };
}

export function editMockLink(id: string, value: string): MockLinkResult {
  const link = store.links.find((l) => l.id === id);
  if (!link) return { ok: false, status: 404 };
  const c = canonical(link.platform, value);
  if (!c) return { ok: false, status: 422 };
  Object.assign(link, c);
  return { ok: true, link };
}

export function removeMockLink(id: string): boolean {
  const before = store.links.length;
  store.links = store.links.filter((l) => l.id !== id);
  return store.links.length < before;
}
