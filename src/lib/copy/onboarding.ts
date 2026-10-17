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
  degree: 'Your current education goes on your profile later.',
  field: 'Pick a suggestion or type your own.',
  destination: 'Pick one for now. You can add up to 3 countries later in Settings.',
};

export const PLAN_PLACEHOLDERS = {
  origin: 'Select your country',
  degree: 'Select a degree',
  field: 'e.g. Business Administration, Law',
  destination: 'Select a country',
};

/** The missing-answers line names each gap in this order. */
export const MISSING = {
  help: 'at least one area',
  origin: 'where you’re from',
  degree: 'what you’re applying for',
  field: 'what you want to study',
  destination: 'where you want to study',
};
export type MissingKey = keyof typeof MISSING;

export const missingLine = (gaps: MissingKey[]) =>
  `To continue, add ${gaps.map((g) => MISSING[g]).join(', ')}.`;

export const stepLabel = (n: number, total: number) => `Step ${n} of ${total}`;

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
  // PRD F1: the design draws no "nobody is bookable" state; title and link from the PRD.
  emptyTitle: 'No mentors are taking bookings right now',
  emptyAction: 'Browse all mentors',
  edit: 'Edit your answers',
  browse: 'Browse all mentors',
  basedOnFallback: 'Based on your answers',
};
