import { MENTOR_PROFILE_ERRORS } from './mentorSettings';

/**
 * The owner's Edit profile form on the Mentor Profile (Mentor Profile.dc.html
 * `editingIntro`): one error per missing field. The headline's two are
 * Settings' own, so both forms always say the same.
 */
/** The share menu's line for an owner whose profile isn't public (`shareNote`). */
export const SHARE_NOTE = {
  pending:
    'Only you can see this page until you’re approved. Others see “This mentor profile isn’t available”.',
  hidden: 'Only you can see this page. Others see “This mentor profile isn’t available”.',
} as const;

export const INTRO_ERRORS = {
  firstName: 'Add your first name.',
  lastName: 'Add your last name.',
  headline: MENTOR_PROFILE_ERRORS.headline,
  headlineTooLong: MENTOR_PROFILE_ERRORS.headlineTooLong,
} as const;
