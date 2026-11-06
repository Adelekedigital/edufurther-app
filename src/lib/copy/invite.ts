import type { IconName } from '@/components/atoms/Icon/iconNames';

/**
 * The invite landing (`/invite/{code}`, PRD Invite Landing; Invite
 * Landing.dc.html saved defaults: framing partner, pitch full, proof schools).
 * The sign-up page's own invite lines stay in `auth.ts` (INVITE_COPY).
 */
export const INVITE_LANDING_COPY = {
  you: 'You',
  perk: 'First session free',
  kicker: (first: string) => `Invited by ${first}`,
  title: (first: string) => `Work on your grad school applications alongside ${first}.`,
  sub: 'Get 1:1 help from a mentor who has already been through the same applications.',
  /** A link that can't be joined: nothing about an inviter. */
  broken: {
    eyebrow: 'You’re invited to EduFurther',
    title: 'Get help with your grad school applications.',
    sub: 'Talk 1:1 with a mentor who has already been through them.',
  },
  benefitsLabel: 'Why EduFurther',
  benefits: [
    {
      icon: 'school',
      title: 'Mentors who’ve been through it',
      body: 'Every mentor got into grad school and knows the applications you’re facing now.',
    },
    {
      icon: 'edit_document',
      title: 'Help where you’re stuck',
      body: 'School choice, scholarships, your statement of purpose, interviews, tests and so much more.',
    },
    {
      icon: 'redeem',
      title: 'Your first session is free',
      body: 'Pick a mentor and a time that suits you.',
    },
  ] satisfies { icon: IconName; title: string; body: string }[],
  schoolsLabel: 'Our mentors studied at',
  signUp: 'Create my account',
  browse: 'Browse mentors first',
  /** A signed-in mentee on someone else's link. */
  existing: {
    title: 'You already have an EduFurther account',
    body: 'Invites are for new members, so this one doesn’t add a credit.',
    action: 'Go to Home',
  },
  /** Explore's bar for a guest holding a live invite, until they sign up. */
  banner: {
    lead: (first: string) => `Invited by ${first}.`,
    rest: 'Your first session is free.',
  },
  /** While the page works out who is visiting (screen readers only). */
  opening: 'Opening your invite…',
};
