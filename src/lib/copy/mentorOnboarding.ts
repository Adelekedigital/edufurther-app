/**
 * Mentor onboarding's words (PRD "Flow and screens", rev 18 Oct, and Mentor
 * Onboarding.dc.html), word for word. The "next steps" list on the sent screen
 * lives with the status page (lib/copy/mentorApplication.ts).
 */
import type { MentorGap, MentorStep } from '@/types/mentorOnboarding';

export const STEP_ORDER: MentorStep[] = ['help', 'education', 'about', 'hours'];

export const stepLabel = (n: number, total = STEP_ORDER.length) => `Step ${n} of ${total}`;

export const FLOW_COPY = {
  requiredNote: 'All fields are required unless marked optional.',
  leaveLabel: 'your answers',
  fillRequired: 'Fill in the required fields to continue.',
  drafting: 'Drafting your About. One moment…',
  resume: 'Welcome back. We kept your answers, so you can pick up here.',
  startOver: 'Start over',
  saved: 'Progress saved',
  savedShort: 'Saved',
  back: 'Back',
  continue: 'Continue',
  submit: 'Submit application',
  submitting: 'Submitting…',
  submitError:
    'We couldn’t send your application. Your answers are saved. Check your connection and try again.',
  // Ours (PRD doesn't word a step-save failure): the saved-work failure pattern.
  saveError:
    'We couldn’t save this step. Your answers are still here. Check your connection and try again.',
  // Ours: loading and load failure aren't worded in the PRD or design.
  loading: 'Loading your application…',
  loadErrorTitle: 'We couldn’t load your application',
  loadErrorBody: 'Your answers are saved. Check your connection and try again.',
  retry: 'Try again',
} as const;

export const HELP_COPY = {
  title: 'What can you help mentees with?',
  sub: 'Pick all that apply. You can change them later in Settings.',
} as const;

export const EDUCATION_COPY = {
  title: 'Where did you study?',
  sub: 'Mentees search by school and degree. Start with the most recent one.',
  school: 'School',
  schoolN: (n: number) => `School ${n}`,
  removeSchool: (n: number) => `Remove school ${n}`,
  university: 'University',
  universityPlaceholder: 'Which school did you attend?',
  inCountry: (country: string) => `In ${country}`,
  change: 'Change',
  countryOfStudy: 'Country of study',
  countryPlaceholder: 'Select a country',
  countryHintKnown: 'Mentees search by where you studied.',
  countryHintUnknown: 'We couldn’t find this university. Tell us where it is.',
  degree: 'Degree',
  field: 'Field of study',
  fieldPlaceholder: 'e.g. Public Health',
  start: 'Start year',
  end: 'End year (or expected)',
  yearPlaceholder: 'Year',
  current: 'This is my current or most recent education',
  add: 'Add another school',
} as const;

export const ABOUT_COPY = {
  title: 'About you',
  sub: 'You’ve done what your mentees are working toward. Let your profile show it.',
  photo: 'Profile photo',
  photoHint: 'A clear photo of you. JPG or PNG. Up to 5MB.',
  origin: 'Where are you from?',
  originPlaceholder: 'Select your country',
  originHint: 'Mentees from the same country often look for someone who made the same move.',
  linkedin: 'LinkedIn profile',
  linkedinPlaceholder: 'linkedin.com/in/your-name',
  linkedinHint: 'We use it to confirm your background.',
  linkedinLink: 'Get your LinkedIn link',
  linkedinUrl: 'https://www.linkedin.com/in/me/',
  linkedinLinkLabel: 'Get your LinkedIn link (opens in a new tab)',
  aboutLabel: 'About (optional)',
  aboutHint: 'Tip: Lead with the path you’ve walked.',
  aboutPlaceholder: 'Your path, what you studied and what you can help with.',
  drafting: 'Drafting from your education and help areas…',
  draftFailed:
    'We couldn’t draft your About right now. Write a few lines, or add it later in your profile.',
} as const;

export const HOURS_COPY = {
  title: 'When can you mentor?',
  sub: 'Pick your days and a time range. You stay in control: change your hours any time in Calendar, or set them per session.',
  days: 'Days',
  hours: 'Hours',
  from: 'From',
  to: 'To',
  presets: { weekdays: 'Weekdays', weekends: 'Weekends', everyDay: 'Every day' },
  noDays: 'Pick at least 1 day.',
  tzPrefix: 'Times shown in',
  tzFallback: 'We couldn’t detect your time zone, so we set UTC. Check it’s right.',
  firstSession: 'Your first session',
  firstSessionSub:
    'We create this for you so mentees can book you once you’re approved. Add more sessions later from Sessions page.',
  introName: 'Intro chat',
  introMeta: '30 min · Free · 1:1 video call',
} as const;

/** Monday first, as the design draws the day buttons. */
export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** "Mon, Wed · 6:00 pm – 9:00 pm"; with no days, the prompt to pick one. */
export function hoursSummary(days: number[], from: string, to: string): string {
  if (!days.length) return HOURS_COPY.noDays;
  const names = [...days].sort((a, b) => a - b).map((i) => DAY_NAMES[i]!.slice(0, 3));
  return `${names.join(', ')} · ${from} – ${to}`;
}

/**
 * The Intro chat's description from the help areas: lower-case, commas and a
 * final "or" (PRD F1, design `introDesc`).
 */
export function introDescription(areas: string[]): string {
  const l = areas.map((a) => a.charAt(0).toLowerCase() + a.slice(1));
  const list =
    l.length > 1
      ? `${l.slice(0, -1).join(', ')} or ${l[l.length - 1]}`
      : (l[0] ?? 'your application');
  return `A free first chat about ${list}. We’ll talk through your goals and plan your next steps.`;
}

export const SENT_COPY = {
  title: (first: string) => (first ? `Application sent, ${first}` : 'Application sent'),
  body: (email: string) =>
    `We’ll review your background and email you at ${email} when there’s an update.`,
  edit: 'Edit my application',
} as const;

/** The inline error under each missing field (fieldGuide=marked). */
export const GAP_COPY: Record<MentorGap, string> = {
  help: 'Pick at least 1 area you can help with.',
  education: 'Add your school, degree, field of study and years.',
  studyCountry: 'Add the country you studied in.',
  photo: 'Add a profile photo.',
  origin: 'Select where you’re from.',
  linkedin: 'Add your LinkedIn profile link.',
  linkedinFormat: 'Use your profile link, like linkedin.com/in/your-name.',
  days: 'Pick at least 1 day.',
};
