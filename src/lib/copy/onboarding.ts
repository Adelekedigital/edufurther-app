/**
 * Every word onboarding shows, from Mentee Onboarding v5.dc.html via the PRD's
 * H8 table, keyed by catalog slug or reason code so wording changes in one place.
 */
import type { IconName } from '@/components/atoms/Icon/iconNames';

export type HelpAreaCopy = {
  title: string;
  body: string;
  icon: IconName;
  /** How the match line names it: "Helps with {reason}". */
  reason: string;
};

/** The design's order, which differs from the catalog's `sort_order`. */
export const HELP_AREAS: { slug: string; copy: HelpAreaCopy }[] = [
  {
    slug: 'program-selection',
    copy: {
      title: 'Find a program',
      body: 'Research and shortlist programs that fit your goals.',
      icon: 'menu_book',
      reason: 'choosing a program',
    },
  },
  {
    slug: 'test-preparation',
    copy: {
      title: 'Test preparation',
      body: 'Prepare for IELTS, TOEFL, GRE, GMAT and other tests.',
      icon: 'edit_note',
      reason: 'test prep',
    },
  },
  {
    slug: 'document-preparation',
    copy: {
      title: 'Document preparation',
      body: 'Statements, essays, CVs and recommendation letters.',
      icon: 'description',
      reason: 'your documents',
    },
  },
  {
    slug: 'school-selection',
    copy: {
      title: 'Find the right school',
      body: 'Compare schools, admission requirements and fit.',
      icon: 'school',
      reason: 'choosing a school',
    },
  },
  {
    slug: 'scholarships-financial-aid',
    copy: {
      title: 'Scholarship guidance',
      body: 'Find and apply for scholarships, grants and aid.',
      icon: 'payments',
      reason: 'scholarships',
    },
  },
  {
    slug: 'interview-preparation',
    copy: {
      title: 'Interview and visa preparation',
      body: 'Practice admission interviews and visa appointments.',
      icon: 'flight_takeoff',
      reason: 'interviews and visas',
    },
  },
];

export const HELP_LIMIT = 3;

/**
 * The four options shown, and what each is stored as. The catalog follows
 * ISCED 2011, where an MBA is a Master's-level degree, so MBA keeps the
 * mentee's word in `raw` (PRD H8).
 */
export const DEGREE_OPTIONS: { value: string; label: string; code: string; raw: string | null }[] =
  [
    { value: 'bachelors', label: 'Bachelor’s', code: 'bachelors', raw: null },
    { value: 'masters', label: 'Master’s', code: 'masters', raw: null },
    { value: 'mba', label: 'MBA', code: 'masters', raw: 'MBA' },
    { value: 'doctorate', label: 'PhD', code: 'doctorate', raw: null },
  ];

export const FIELD_SUGGESTIONS = [
  'Business Administration',
  'Computer Science',
  'Data Science',
  'Public Health',
  'Law',
  'Economics',
  'Engineering',
  'Medicine',
  'Education',
];
export const FIELD_MIN = 2;
export const FIELD_MAX = 100;

/** Listed first in "Where do you want to study?", by catalog label. */
export const TOP_DESTINATIONS = [
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'Netherlands',
  'Ireland',
  'Australia',
  'France',
];
/** The destination answer for "Not sure yet": no goal country is stored. */
export const NOT_SURE = 'not-sure';
export const NOT_SURE_LABEL = 'Not sure yet';

export const STEP_COPY = {
  help: {
    title: 'What would you like help with?',
    sub: 'Choose up to 3 areas. You can update this later.',
  },
  plans: {
    title: 'Tell us about your study plans',
    sub: 'We use this to match you with mentors who’ve been on the same path.',
  },
};

export const PLAN_LABELS = {
  origin: 'Where are you from?',
  degree: 'What are you applying for?',
  field: 'What do you want to study?',
  destination: 'Where do you want to study?',
};

export const PLAN_HINTS = {
  origin: 'We look for mentors who made the same move.',
  degree: 'The next degree you want to study, not the one you have now.',
  field: 'Choose from the list, or type it if it’s not there.',
  // Settings › Goals takes up to 3; "Settings" links there (design, 2026-10-17; #284).
  destination: 'Pick one for now. You can add more later in Settings.',
};

/** The destination hint's link: the word it sits on and where it goes (a new tab). */
export const DESTINATION_LINK = {
  text: 'Settings',
  href: '/settings/goals',
};

export const PLAN_PLACEHOLDERS = {
  origin: 'Select your country',
  degree: 'Select a degree',
  field: 'e.g. Business Administration, Law',
  destination: 'Select a country',
};

/** The line under each missing answer, once Continue was pressed (design `fieldGuide=marked`). */
export const FIELD_ERRORS = {
  help: 'Pick at least one area.',
  origin: 'Select your home country.',
  degree: 'Pick the degree you’re applying for.',
  field: 'Add what you want to study.',
  destination: 'Pick where you want to study.',
};
export type MissingKey = keyof typeof FIELD_ERRORS;

export const stepLabel = (n: number, total: number) => `Step ${n} of ${total}`;

/** The guest path from Book (PRD H1, US-6; Mentee Onboarding v5.dc.html `forBanner`). */
export const GUEST_COPY = {
  bannerTitle: (first: string) => `Almost there. Then you’ll book with ${first}.`,
  // PRD US-6: nothing holds the time, so never "held".
  bannerSub: (first: string) => `Your pick is saved. We’ll take you back to book ${first}.`,
  continueToBook: (first: string) => `Continue to book ${first}`,
  // `after=booking` (round 4): the last step's line and button.
  creditNote: (first: string) => `Finish to book ${first} and get 1 free session credit.`,
  backToBooking: 'Back to booking',
  // Already finished, sent from a booking: back to it, as sign-in says it (ours).
  alreadySetUp: 'You’re already set up. Taking you back to your booking…',
  matchTitle: (first: string) => `You’re all set to book ${first}`,
  matchSub: (first: string) =>
    `Your time and session are saved. Book now and ${first} will see your goals.`,
  unavailableNotice: (first: string) => `${first} isn’t taking new bookings right now`,
  unavailableBody: 'Your answers are saved. Here are mentors with open times who fit your goals.',
  unavailableTitle: 'Mentors who fit your goals',
  unavailableSub: 'Book one of these instead, or browse all mentors.',
};

export const MATCH_COPY = {
  title: (n: number) => (n === 1 ? 'Your top mentor match' : `Your top ${n} mentor matches`),
  sub: 'These mentors fit your goals. Pick one and book your first free session.',
  noExactTitle: 'No exact matches yet',
  noExactSub: 'No mentor matches all of that yet. These are the closest to your goals.',
  oneNote: 'That’s the one closest fit right now. New mentors join every week.',
  loadingTitle: 'Finding your mentors…',
  loadingSub: 'Matching on where you want to study, your level and the help you picked.',
  loadingLabel: 'Finding your mentors',
  errorPageTitle: 'Your matches',
  errorTitle: 'We couldn’t load your matches',
  errorBody: 'Your answers are saved. Check your connection and try again.',
  retry: 'Try again',
  // matchState=noMentors (design, 2026-10-17).
  emptyTitle: 'No mentors are taking bookings right now',
  emptyBody: 'Your answers are saved. Browse all mentors to see who’s on EduFurther.',
  emptyAction: 'Browse all mentors',
  edit: 'Edit your answers',
  browse: 'Browse all mentors',
  basedOnFallback: 'Based on your answers',
};

/** The phone topics sheet, worded as MentorCard words its own Book button. */
export const SHEET_COPY = {
  title: (first: string) => `${first} can help with`,
  book: (first: string) => `Book session with ${first}`,
  seeAvailability: 'See availability',
  offline: 'Booking needs a connection',
  viewProfile: 'View profile',
};

export const FLOW_COPY = {
  back: 'Back',
  continue: 'Continue',
  // Above Continue once it was pressed with answers missing (as in mentor onboarding).
  fillRequired: 'Fill in the required fields to continue.',
  seeMatches: 'See my matches',
  resume: 'Welcome back. We kept your answers, so you can pick up here.',
  // PRD H5; Mentee Onboarding v5.dc.html `visitor=migrated` (design reply, 2026-10-17).
  broughtOver: 'We brought over your earlier answers. Check them and continue.',
  startOver: 'Start over',
  alreadySetUp: 'You’re already set up. Taking you to your Home…',
  // Ours, PROVISIONAL (design draws no loading or failed load for the steps; design request).
  loading: 'Loading your answers',
  loadErrorTitle: 'We couldn’t load your answers',
  loadErrorBody: 'Check your connection and try again.',
  saveError: 'We couldn’t save your answers. Check your connection and try again.',
};

/** Step 1's switch to the other onboarding, for a fresh account (ours, owner 2026-10-20). */
export const ROLE_SWITCH_COPY = {
  mentor: 'Join as a mentor',
  mentee: 'Join as a mentee',
  error: 'Couldn’t switch. Try again.',
};
