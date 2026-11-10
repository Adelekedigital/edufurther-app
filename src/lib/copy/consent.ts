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
  title: 'Help us make EduFurther better',
  body: 'With your OK, we use analytics cookies, and recordings of the onboarding and booking pages, to see where people get stuck. What you type is always hidden. If you decline, we only count visits, without cookies.',
  privacy: 'Privacy policy',
  accept: 'Accept',
  decline: 'Decline',
  settingsTitle: 'Analytics cookies',
  settingsHint:
    'Lets us see how you use EduFurther, with recordings of the onboarding and booking pages. What you type is always hidden. Off, we only count visits, without cookies.',
} as const;
