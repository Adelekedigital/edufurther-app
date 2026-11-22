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
 * app: replay runs on profile setup (onboarding, not the sign-up page) and the
 * booking window (not joining a session),
 * and a decline still counts anonymous steps, not only page visits. The second
 * button says what you keep: "Essential only".
 *
 * Replay across the app (owner, 2026-11-22): no longer limited to profile
 * setup and booking, so the words drop "On these pages" and say what stays
 * hidden: every word on screen and anything typed (all text is masked, since
 * screens show names, emails and booking details). That is a change in
 * substance: CONSENT_VERSION moved to 2026-11-22 and everyone is asked again.
 *
 * Compact + close (owner, 2026-11-13): on a phone the full card covered
 * log-in and sign-up. Collapsed, it shows one short question; "Learn more"
 * opens the approved text above in place. The short line is a question, not
 * "We use analytics cookies", because nothing is set until the visitor
 * allows it (UX writer). The X is the decline, so its name says so.
 */
export const CONSENT_COPY = {
  /** The collapsed line, and the banner region's name read out when a screen reader lands in it. */
  short: 'Can we use analytics cookies to improve EduFurther?',
  /** The disclosure's label, closed then open. */
  more: 'Learn more',
  less: 'Show less',
  /** The corner X: closing counts as "Essential only", so its name says that. */
  close: 'Close, essential only',
  /** The approved explanation, shown when "Learn more" is open. */
  body: 'If you allow analytics cookies, we can see where people get stuck, for example while setting up a profile or booking a session. We may keep a replay of clicks and scrolling to understand how people use EduFurther, with the words on screen and anything you type hidden. If you choose essential only, we only count visits and steps anonymously, without cookies.',
  /** Members only: a guest has no Settings to change it in. */
  change: 'You can change this anytime in Settings › Login and security.',
  privacy: 'Privacy policy',
  accept: 'Allow analytics',
  decline: 'Essential only',
  settingsTitle: 'Analytics cookies',
  settingsHint:
    'Shows us where people get stuck, for example while setting up a profile or booking a session. We may keep a replay of clicks and scrolling, with the words on screen and anything you type hidden. When this is off, we only count visits and steps anonymously, without cookies.',
} as const;
