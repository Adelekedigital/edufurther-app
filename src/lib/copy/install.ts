/** The install nudge and the More menu's way to it (owner, 2026-11-18). */

export const INSTALL_COPY = {
  title: 'EduFurther, one tap away',
  lead: {
    booking: (name: string | null) =>
      name ? `Get a reminder before ${name}’s session.` : 'Get a reminder before your session.',
    message: (name: string | null) => `Know the moment ${name ?? 'your mentor'} replies.`,
    onboarding: 'Your matches, messages and session reminders, one tap from your home screen.',
    /** A mentor's onboarding (no matches) and the More menu. */
    general: 'Your messages and session reminders, one tap from your home screen.',
  },
  /** Android: the one reason, under the line (owner, 2026-11-18). */
  reason: 'Free, takes a few seconds, no app store.',
  add: 'Add to home screen',
  /** iPhone Safari: no prompt to call, so the steps (and no button: the close is the X). */
  steps: {
    shareBefore: 'Tap',
    share: 'Share',
    shareAfter: 'in Safari’s toolbar',
    choose: 'Choose',
    addToHome: 'Add to Home Screen',
    open: 'Open EduFurther from your home screen',
  },
  menu: {
    label: 'Install the app',
    sub: 'Session reminders, one tap from your home screen',
  },
} as const;
