/**
 * Sharing a mentor's profile (owner, 2026-11-13; one Copy and the device's
 * share sheet, owner 2026-11-14): the share modal's words, the message that
 * goes with the link, and the link preview chat apps draw.
 * Reviewed with the EduFurther UX writer: no em dashes, peer proof, no "free"
 * promise (a booking spends a credit).
 */

/** The message, mentor's own share or anyone else's. The link follows it. */
function message(own: boolean, name: string): string {
  return own
    ? 'I’m a mentor on EduFurther. I’ve been through the grad school application process, and I’d be glad to help you with yours. Book a 1:1 session with me:'
    : `${name} is a mentor on EduFurther and has been through the grad school application process. Book a 1:1 session:`;
}

/** Copy's clipboard: the message, then the link on its own line. */
const withLink = (own: boolean, name: string, url: string) => `${message(own, name)}\n${url}`;

/** The help areas named in a preview, at most this many. */
const PREVIEW_TOPICS = 3;

export const MENTOR_SHARE_COPY = {
  /** The share modal (bottom sheet on phones). */
  modal: {
    title: (own: boolean, name: string) => (own ? 'Share your profile' : `Share ${name}’s profile`),
    subtitle: (own: boolean) =>
      own
        ? 'Mentees who open the link can see your profile and book a session.'
        : 'Send it to someone it could help.',
  },
  message,
  /** The profile link in LinkSharePanel: Copy and the share sheet carry the same words. */
  panel: (own: boolean, name: string) =>
    ({
      kind: 'mentor_profile',
      own,
      copyText: (url: string) => withLink(own, name, url),
      share: (url: string) => ({ title: `${name} on EduFurther`, text: message(own, name), url }),
      copyLabel: 'Copy link',
      copiedLabel: 'Link copied',
    }) as const,
  /** The link preview (og: lines and opengraph-image). */
  preview: {
    title: (name: string) => `${name} · EduFurther mentor`,
    /**
     * Headline, school and help areas, each only when the profile has it. A
     * headline that already names the school isn't followed by it again.
     */
    description: (p: { headline: string | null; school: string | null; topics: string[] }) =>
      [
        p.headline?.replace(/[.\s]+$/, ''),
        p.school &&
          !p.headline?.toLowerCase().includes(p.school.toLowerCase()) &&
          `Studied at ${p.school}`,
        p.topics.length > 0 && `Helps with ${p.topics.slice(0, PREVIEW_TOPICS).join(', ')}`,
      ]
        .filter(Boolean)
        .map((s) => `${s}.`)
        .join(' ') || 'A mentor on EduFurther who’s been through it.',
    fallbackTitle: 'Find a mentor on EduFurther',
    fallbackBody:
      '1:1 help with your grad school applications from mentors who’ve been through it.',
    alt: 'A mentor on EduFurther',
    /** The tab title when the profile can't be read on the server. */
    tabFallback: 'Mentor profile',
    tabDescription: 'A mentor’s background, sessions and track record on EduFurther.',
  },
} as const;
