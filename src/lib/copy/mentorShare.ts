/**
 * Sharing a mentor's profile (owner, 2026-11-13): the share menu's items, the
 * message that goes with the link, and the link preview chat apps draw.
 * Reviewed with the EduFurther UX writer: no em dashes, peer proof, no "free"
 * promise (a booking spends a credit).
 */

/** The message, mentor's own share or anyone else's. The link follows it. */
function message(own: boolean, name: string): string {
  return own
    ? 'I’m a mentor on EduFurther. I’ve been through the grad school application process, and I’d be glad to help you with yours. Book a 1:1 session with me:'
    : `${name} is a mentor on EduFurther and has been through the grad school application process. Book a 1:1 session:`;
}

/** The help areas named in a preview, at most this many. */
const PREVIEW_TOPICS = 3;

export const MENTOR_SHARE_COPY = {
  menu: {
    copyLink: 'Copy profile link',
    copyMessage: 'Copy message',
    whatsapp: 'Share on WhatsApp',
    x: 'Share on X',
    linkedin: 'Share on LinkedIn',
    email: 'Share by email',
  },
  status: {
    linkCopied: 'Link copied',
    linkFailed: 'Couldn’t copy the link',
    messageCopied: 'Message copied',
    messageFailed: 'Couldn’t copy the message',
  },
  message,
  /** Copy message and WhatsApp: the message, then the link on its own line. */
  withLink: (own: boolean, name: string, url: string) => `${message(own, name)}\n${url}`,
  /** The email body: the same, with the CRLF line break a mailto body takes (RFC 6068). */
  emailBody: (own: boolean, name: string, url: string) => `${message(own, name)}\r\n${url}`,
  emailSubject: (name: string) => `${name} on EduFurther`,
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
