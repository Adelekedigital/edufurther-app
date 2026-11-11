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
 */
export const CONSENT_COPY = {
  /** Also the banner region's name, read out when a screen reader lands in it. */
  title: 'Can we use analytics cookies?',
  body: 'They show us which onboarding and booking steps confuse people, so we can fix them. On those pages we also record your visit, with anything you type hidden. If you decline, we only count visits, with no cookies.',
  /** Members only: a guest has no Settings to change it in. */
  change: 'You can change this anytime in Settings › Login and security.',
  privacy: 'Privacy policy',
  accept: 'Allow analytics',
  decline: 'Decline',
  settingsTitle: 'Analytics cookies',
  settingsHint:
    'Shows us which onboarding and booking steps confuse people. On those pages we also record your visit, with anything you type hidden. When this is off, we only count visits, with no cookies.',
} as const;
