/**
 * Sessions (`/session-types`; Session Types.dc.html, copy research). Copy
 * reviewed with edufurther-ux-writer, 2026-10-21. Approval uses Settings'
 * words everywhere (owner, 2026-10-21), not the design's "Booking
 * confirmation": the switch and its line come from `lib/copy/mentorSettings`.
 */

/** The page and its titles. The URL stays /session-types. */
export const SESSIONS_COPY = {
  title: 'Sessions',
  lede: 'What mentees can book with you. Each session can have its own description, questions and booking rules.',
  create: 'Create session',
  createTitle: 'Create a session',
  editTitle: 'Edit session',
  loading: 'Loading your sessions',
  loadError: 'We couldn’t load your sessions',
  emptyTitle: 'Add a session so mentees can book you',
  emptyBody: 'Start from a template or build your own.',
  backToList: 'Back to sessions',
  notFoundTitle: 'This session isn’t available',
  notFoundBody: 'It may have been deleted. Your other sessions are on the list.',
  loadOneError: 'We couldn’t load this session',
  guestTitle: 'Log in to manage your sessions',
  guestBody: 'Sessions are what mentees can book with you.',
  /** A 409 on create or rename: the name is already one of theirs. */
  nameTaken: 'You already have a session with this name.',
  /** Beside Create (design `countLabel`): every session not deleted counts. */
  count: (n: number, limit: number) => `${n} of ${limit}`,
  /** Create, templates and Duplicate at the limit, and a 409 past it (PRD list). */
  atLimit: (limit: number | null) =>
    limit === null
      ? 'You’ve reached your session limit.'
      : `You can offer up to ${limit} sessions.`,
} as const;

/** The wizard's steps (design `stepDefs`, research names). */
export const STEP_COPY = [
  {
    title: 'Define your session',
    description: 'Tell mentees what this session is about and why they should book it.',
  },
  {
    title: 'Prepare for session',
    description: 'Collect what you need to prepare. Mentees answer these when they book.',
  },
  {
    title: 'Set booking rules',
    description:
      'Set how this session is booked. Use your default booking rules or customize them for this session.',
  },
  {
    title: 'Review and publish',
    description: 'Check what mentees will see before you publish this session.',
  },
] as const;

export const WIZARD_COPY = {
  /** Every step's primary action but the last (design `^Continue to .+` → Continue). */
  continue: 'Continue',
  back: 'Back',
  stepLine: (step: number, title: string) => `Step ${step} of 4 · ${title}`,
  /** The leave guard's name for what would be lost. */
  leaveEdit: 'this session',
  leaveNew: 'this new session',
  discardNew: 'Discard this session?',
  discardEditBody: 'Your changes to this session won’t be saved.',
  questionRemoved: (text: string) => `“${text}” will be removed from this session.`,
} as const;

/** Step 1. */
export const DETAILS_COPY = {
  nameHint: 'Be specific. Mentees see this when choosing what to book.',
  descriptionHint: 'Describe what you’ll help mentees accomplish. Aim for 3–5 sentences.',
  topicsLabel: 'What does this session help with?',
  topicsHint: (max: number) =>
    `Pick up to ${max} of your help areas. Mentees filter by these on Explore.`,
  stagesHint: 'Choose the stages this session is most useful for.',
  anyStage: 'All stages',
  /** Pricing is free-only in v1 (handoff E5, design `pricing` freeOnly). */
  priceLabel: 'Price',
  free: 'Free',
  freeNote: 'All sessions are free for now.',
  /** Continue with gaps (design `stepError`): with each field's own error. */
  stepError: 'Fill in the required fields to continue.',
} as const;

/** Step 2. */
export const QUESTIONS_COPY = {
  none: 'No questions yet. Add only what you need before the session.',
} as const;

/** Step 3. */
export const RULES_COPY = {
  sectionTitle: 'Booking rules',
  groupLabel: 'Booking rules for this session',
  useDefaults: 'Use my defaults',
  useDefaultsBody:
    'Follows your default booking rules. Changes to your defaults will appear here too.',
  custom: 'Customize for this session',
  customBody: 'Set different booking rules for this session. Your default settings won’t change.',
  /**
   * The inherit option on the approval select names what it resolves to
   * (Session Types PRD, step 3); on and off use Settings' words. Before
   * the defaults load there's nothing to name yet.
   */
  inheritApproval: (resolved: string | null) =>
    resolved ? `${resolved} (your default)` : 'Your default',
  approvalHint: 'Choose how bookings are confirmed.',
  /** New tabs: following them here would drop the session being edited. */
  manageRules: 'Manage booking rules',
  manageRulesHref: '/settings/booking',
  manageHours: 'Manage weekly availability',
  manageHoursHref: '/calendar',
  hoursTitle: 'When can mentees book this?',
  hoursGroupLabel: 'Hours for this session',
  useWeekly: 'Use my weekly availability',
  useWeeklyBody: 'Mentees book this session in the weekly hours you set in Calendar.',
  ownHours: 'Set availability for this session',
  ownHoursBody:
    'Offer this session at different times without changing your weekly availability. Blocked dates apply to this session too.',
} as const;

/** Step 4's rows (PRD Step 4, design `summary` in the research copy). */
export const REVIEW_COPY = {
  details: STEP_COPY[0].title,
  questions: STEP_COPY[1].title,
  rules: STEP_COPY[2].title,
  length: 'Session length',
  hours: 'Availability',
  /** With the mentor's weekly hours, once they've loaded. */
  weekly: (summary: string | null) =>
    summary ? `Your weekly availability (${summary})` : 'Your weekly availability',
  ownHours: 'Custom hours for this session',
  /** Inheriting: the mentor's defaults, approval in its own row. */
  rulesRow: 'Booking rules',
  rulesMine: (summary: string | null) => (summary ? `My defaults · ${summary}` : 'My defaults'),
  none: 'None',
} as const;

export const PUBLISHED_TITLE = 'Session published';
