import { locationLine } from '@/lib/utils/format';
/**
 * Mentor Settings (Mentor Settings.dc.html, PRD 19 Oct). Copy reviewed with
 * edufurther-ux-writer, 2026-10-19.
 */

/** The screen's subline for a mentor (design `mentorView`). */
export const MENTOR_SETTINGS_SUB = 'Manage how mentees book you and what they see on your profile.';

export const BOOKING_COPY = {
  approveTitle: 'Approve bookings',
  rulesTitle: 'Booking rules',
  rulesSub:
    'You control when mentees can book you. Change these for any single session in Sessions.',
  rules: {
    durationMin: { label: 'Session length', hint: 'How long each booking lasts.' },
    noticeHours: {
      label: 'Minimum notice',
      hint: 'How much notice you need before a session is booked.',
    },
    windowDays: { label: 'Booking window', hint: 'How far in advance mentees can book you.' },
    breakMin: { label: 'Buffer between sessions', hint: 'Time kept free after each booking.' },
  },
  loadError: 'We couldn’t load your booking rules. Check your connection and try again.',
  retry: 'Try again',
  saveBar: 'Unsaved changes to booking rules',
  saved: 'Changes saved',
  /** Ours: the hook's own copy says "preferences", which isn't our word for these. */
  saveFailed: 'Your booking rules didn’t save. Your changes are still here. Try again.',
  saveOffline: 'You’re offline. Your changes are still here. Try again when you’re connected.',
} as const;

/**
 * The approval row's line (Mentor Settings.dc.html `approvalLine`). An
 * unanswered request expires `hours` before the session (the platform's
 * RESPONSE_WINDOW_HOURS, backend #504), shown as Unconfirmed, and both sides
 * are told (request_expired). Without the setting, no number.
 */
export function approvalLine(on: boolean, hours: number | null): string {
  if (!on) return 'Off: mentees book your open times and they’re confirmed straight away.';
  return hours
    ? `You accept each request first. If it’s still waiting ${hours} ${hours === 1 ? 'hour' : 'hours'} before the session, it expires and the mentee is told.`
    : 'You accept each request first. If you don’t answer in time, it expires and the mentee is told.';
}

/** Approval as a summary token: Settings' words on every screen (owner, 2026-10-21). */
export const approvalShort = (on: boolean) =>
  on ? 'You approve each booking' : 'Confirmed straight away';

/** The note under the rules; the count is left out when it's 0 or couldn't load. */
export function rulesNote(sessionsUsingRules: number | null): string {
  const after =
    'Once you save, changes apply to new bookings. Sessions already booked stay as they are.';
  if (!sessionsUsingRules) return after;
  const count =
    sessionsUsingRules === 1
      ? '1 of your sessions uses these rules.'
      : `${sessionsUsingRules} of your sessions use these rules.`;
  return `${count} ${after}`;
}

/** Settings › Profile for a mentor (Mentor Settings.dc.html `isProfile`). */
export const MENTOR_PROFILE_COPY = {
  photoTitle: 'Profile photo and cover',
  // The uploads' real limits (avatar.ts, cover.ts), not the design draft's 1 MB.
  photoHint: 'JPG, PNG or WebP, max 5 MB. Covers look best at 1440×180 or larger.',
  photoLabel: 'Your profile photo',
  aboutSection: 'About you',
  name: 'Full name',
  headline: 'Headline',
  headlineHint: 'Shown under your name on Explore and your profile.',
  about: 'About (optional)',
  aboutHint:
    'Lead with the path you’ve walked (for example “Fully funded PhD at Mississippi State”), then how you help.',
  aboutDraftNote: 'We drafted this from your profile information. Edit it in your own words.',
  background: 'Background',
  backgroundSub: 'Mentees filter by these, so they help the right people find you.',
  origin: 'Country of origin',
  originHint: 'We use this to match you with mentees from the same country.',
  study: 'Country you studied in',
  studyHint: 'Shown as “Studied in …”.',
  countryPlaceholder: 'Search countries',
  gender: 'Gender (optional)',
  // The design's "Only used for mentee filters" isn't true: nothing filters on it (PRD: never shown).
  genderHint: 'Never shown on your profile.',
  genderPlaceholder: 'Select',
  genders: ['Woman', 'Man', 'Non-binary', 'Prefer not to say'],
  // Optional (founder, 21 Oct): onboarding never asks, most mentors have none.
  languages: 'Languages you mentor in (optional)',
  addLanguage: 'Add another language',
  addLanguagePlaceholder: 'For example, Twi',
  add: 'Add',
  cancel: 'Cancel',
  searchingLanguages: 'Searching…',
  languageSearchFailed: 'We couldn’t search languages. Try again.',
  noLanguageMatch: (q: string) => `No languages match “${q}”.`,
  preview: 'How mentees see you',
  openProfile: 'Open profile',
  previewNameEmpty: 'Your name',
  previewPlaceEmpty: 'Add where you’re from',
  book: 'Book a session',
  message: 'Message',
  saveBar: 'Unsaved changes to your profile',
  saved: 'Profile saved',
  parts: {
    details: 'your name, About, gender and origin',
    listing: 'your headline and study country',
    languages: 'your languages',
  },
  partlySaved: (what: string) => `Some changes saved, but ${what} didn’t. Try again.`,
  loadError: 'We couldn’t load your profile. Check your connection and try again.',
  retry: 'Try again',
} as const;

/** Inline errors on Save (PRD: Profile). */
export const MENTOR_PROFILE_ERRORS = {
  name: 'Add your full name.',
  headline: 'Add a headline.',
  headlineTooLong: 'Keep your headline to 80 characters.',
  origin: 'Select your country of origin.',
  study: 'Select the country you studied in.',
} as const;
export type MentorProfileGap = 'name' | 'headline' | 'origin' | 'study';

/** The header's location line (design `previewPlace`), or the empty prompt. */
export function previewPlace(origin: string | null, study: string | null): string {
  return locationLine(origin, study) ?? MENTOR_PROFILE_COPY.previewPlaceEmpty;
}

/** Settings › Expertise for a mentor (Mentor Settings.dc.html `isExpertise`, expertiseEdit=modal). */
export const MENTOR_EXPERTISE_COPY = {
  topicsTitle: 'What you help with',
  topicsSub: 'Mentees search by these topics. Pick the ones you’d confidently run a session on.',
  editTopics: 'Edit',
  editTopicsLabel: 'Edit topics',
  topicsEmptyTitle: 'Mentees can’t find you by topic yet',
  topicsEmptyBody:
    'Mentees search by what they need help with. Add at least one topic to show up in their results.',
  chooseTopics: 'Choose topics',
  topicsUpdated: 'Topics updated',
  guideTitle: 'Where can you guide mentees to?',
  guideSub: 'Places you studied, applied to or know the process for.',
  /** The chip group's name: the card's heading already says the rest. */
  guideGroupLabel: 'Countries',
  addCountry: 'Add another country',
  addCountryPlaceholder: 'For example, Japan',
  add: 'Add',
  cancel: 'Cancel',
  searchingCountries: 'Searching…',
  countrySearchFailed: 'We couldn’t load countries. Try again.',
  noCountryMatch: (q: string) => `No countries match “${q}”.`,
  guideSaveBar: 'Unsaved changes to your countries',
  guideSaved: 'Countries saved',
  guideSaveFailed: 'We couldn’t save your countries. Your changes are still here. Try again.',
  educationSub:
    'Degrees you’ve completed or are working on. Mentees filter by degree level and school.',
  educationEmptyTitle: 'Add where you’ve studied',
  educationEmptyBody:
    'Mentees filter by degree level and school, so your degrees help them find you.',
  awardsTitle: 'Scholarships and awards',
  awardsSub: 'Funding you’ve won shows mentees you can help them win it too.',
  addAward: 'Add award',
  awardsEmptyTitle: 'Add the funding you’ve won',
  awardsEmptyBody:
    'Scholarships, assistantships and fellowships show mentees you’ve done what they’re trying to do.',
  addFirstAward: 'Add your first award',
  funding: { full: 'Fully funded', partial: 'Partial funding' },
  editAward: (title: string) => `Edit ${title}`,
  deleteAward: (title: string) => `Delete ${title}`,
  awardAdded: 'Award added',
  awardUpdated: 'Award updated',
  awardDeleted: 'Award deleted',
  loadError: 'We couldn’t load this. Check your connection and try again.',
  retry: 'Try again',
} as const;
