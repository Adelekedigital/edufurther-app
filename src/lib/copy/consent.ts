/**
 * Analytics consent (PRD 30): the banner and the Settings switch.
 *
 * PROVISIONAL, pending legal review (owner, 2026-11-10): the banner flag
 * (NEXT_PUBLIC_CONSENT_BANNER_ENABLED) stays off until legal approves these
 * words. A change in substance bumps CONSENT_VERSION (lib/analytics/consent),
 * so everyone is asked again.
 *
 * Shaped like a standard cookie notice (owner's sample, 2026-11-11): say it is
 * cookies, what they are for, what declining means and where to change it.
 * What is collected did not change, so CONSENT_VERSION stays.
 *
 * Legal's wording (owner, 2026-11-12), with two facts corrected to match the
 * app: replay runs on sign-up and the booking window (not joining a session),
 * and a decline still counts anonymous steps, not only page visits. The second
 * button says what you keep: "Essential only".
 */
export const CONSENT_COPY = {
  /** Also the banner region's name, read out when a screen reader lands in it. */
  title: 'Can we use analytics cookies?',
  body: 'If you allow analytics cookies, we can see where people get stuck, for example while signing up or booking a session. On these pages, we may keep a replay of clicks and scrolling to understand how people use EduFurther. Anything you type stays hidden. If you choose essential only, we only count visits and steps anonymously, without cookies.',
  /** Members only: a guest has no Settings to change it in. */
  change: 'You can change this anytime in Settings › Login and security.',
  privacy: 'Privacy policy',
  accept: 'Allow analytics',
  decline: 'Essential only',
  settingsTitle: 'Analytics cookies',
  settingsHint:
    'Shows us where people get stuck, for example while signing up or booking a session. On these pages, we may keep a replay of clicks and scrolling. Anything you type stays hidden. When this is off, we only count visits and steps anonymously, without cookies.',
} as const;
