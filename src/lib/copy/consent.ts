/**
 * Analytics consent (PRD 30): the banner and the Settings switch.
 *
 * PROVISIONAL, pending legal review (owner, 2026-11-10): the banner flag
 * (NEXT_PUBLIC_CONSENT_BANNER_ENABLED) stays off until legal approves these
 * words. A change in substance bumps CONSENT_VERSION (lib/analytics/consent),
 * so everyone is asked again.
 */
export const CONSENT_COPY = {
  /** Also the banner region's name, read out when a screen reader lands in it. */
  title: 'Help us see where people get stuck',
  body: 'With your OK, we use analytics cookies and record the onboarding and booking pages to find what’s confusing. We hide what you type. If you decline, we only count visits, with no cookies.',
  privacy: 'Privacy policy',
  accept: 'Allow analytics',
  decline: 'Decline',
  settingsTitle: 'Analytics cookies',
  settingsHint:
    'Lets us record the onboarding and booking pages to see where people get stuck. We hide what you type. When this is off, we only count visits, with no cookies.',
} as const;
