/**
 * Every word Settings shows, from Mentee Settings.dc.html and Settings
 * handoff.md (PRD: Mentee Settings), reviewed with edufurther-ux-writer.
 * Ours, where the design draws nothing: the load and save failures.
 */

export const SETTINGS_COPY = {
  title: 'Settings',
  sub: 'Your details, what you’re working toward, and how you sign in.',
  tabsLabel: 'Settings',
  loadError: 'We couldn’t load your settings.',
  loadErrorBody: 'Check your connection and try again.',
  retry: 'Try again',
} as const;

export type SettingsTab = 'booking' | 'profile' | 'goals' | 'education' | 'security';

/** Tab order and names (design `tabItems`, menteeTabs=split). */
export const TAB_LABELS: Record<SettingsTab, string> = {
  // Mentor only (Mentor Settings.dc.html `tabItems`).
  booking: 'Booking rules',
  profile: 'Profile',
  goals: 'Goals',
  education: 'Education',
  security: 'Login and security',
};

export const PROFILE_COPY = {
  photo: 'Profile photo',
  photoHint: 'JPG or PNG, max 5 MB.',
  photoLabel: 'Your profile photo',
  section: 'About you',
  name: 'Full name',
  country: 'Country you live in',
  countryHint: 'Helps us suggest mentors who made the same move.',
  countryPlaceholder: 'Select a country',
  languages: 'Languages you speak',
  languagesHint: 'So you can have sessions in the language you’re most comfortable in.',
  addLanguage: 'Add another language',
  addLanguagePlaceholder: 'For example, Twi',
  add: 'Add',
  cancel: 'Cancel',
  // Ours: the catalog search behind "Add another language".
  searchingLanguages: 'Searching…',
  languageSearchFailed: 'We couldn’t search languages. Try again.',
  noLanguageMatch: (q: string) => `No languages match “${q}”.`,
  commonLanguagesFailed: 'We couldn’t load the language list.',
  retry: 'Try again',
  bio: 'A few lines about you (optional)',
  bioPlaceholder: 'Where you are now and where you’re headed',
  bioHint: 'Mentors read this before your session.',
  bioDraftNote: 'We drafted this from your profile information. Edit it in your own words.',
} as const;

/** Inline errors on Save with gaps (handoff: required fields, 19 Oct). */
export const PROFILE_ERRORS = {
  name: 'Add your full name.',
  country: 'Select the country you live in.',
  langs: 'Pick at least one language.',
} as const;
export type ProfileGap = keyof typeof PROFILE_ERRORS;

export const SAVE_COPY = {
  formError: 'Fill in the required fields to continue.',
  profileBar: 'Unsaved changes to your profile',
  barLabel: 'Unsaved changes',
  discard: 'Discard',
  save: 'Save changes',
  saving: 'Saving…',
  waitForDraft: 'Your draft is still being written. Save once it’s in.',
  profileSaved: 'Profile saved',
  profileFailed: 'We couldn’t save your profile. Your changes are still here. Try again.',
  profileOffline: 'You’re offline. Your changes are still here. Try again when you’re connected.',
  languagesFailed: 'Your details saved, but your languages didn’t. Try again.',
} as const;

/** Settings › Education (design `isMEdu`, menteeTabs=split: the card's own header). */
export const EDUCATION_COPY = {
  title: 'Education',
  sub: 'Where you’ve studied or are studying now.',
  add: 'Add education',
  emptyTitle: 'Add where you’ve studied',
  emptyBody: 'Your degree and school help us match you with mentors who took the same path.',
  loading: 'Loading your education',
  edit: (title: string) => `Edit ${title}`,
  remove: (title: string) => `Delete ${title}`,
  /** The delete confirm's line (design `deleteAwardSub`, mentee). */
  deleteSub: (title: string, where: string) =>
    `“${title}” (${where}) will be removed. This can’t be undone.`,
  added: 'Education added',
  updated: 'Education updated',
  deleted: 'Education deleted',
} as const;
