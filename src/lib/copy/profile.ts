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

/**
 * "Update your review" (Mentor Profile.dc.html reviewState `again`). The
 * design's "3 more sessions" has no count behind it (the API says only "2 or
 * more since"), so the title doesn't name one.
 */
export const REVIEW_COPY = {
  againTitle: 'You’ve had more sessions since your last review',
  againBody: (firstName: string, lastReviewedAt: string, now = new Date()) => {
    const at = new Date(lastReviewedAt);
    const month = at.toLocaleString('en-US', {
      month: 'long',
      ...(at.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
    });
    return `You last reviewed ${firstName} in ${month}. An update shows mentees how the mentoring has gone over time.`;
  },
  againAction: 'Update your review',
} as const;

export const INTRO_ERRORS = {
  firstName: 'Add your first name.',
  lastName: 'Add your last name.',
  headline: MENTOR_PROFILE_ERRORS.headline,
  headlineTooLong: MENTOR_PROFILE_ERRORS.headlineTooLong,
} as const;
