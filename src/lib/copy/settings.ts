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

/**
 * Settings › Login and security (SecuritySettings.dc.html, auth=passwordless).
 * The delete warning is worded for a count only (GET /me has no names or
 * dates), and leaves the session sentence out at 0. Ours: the failed delete.
 * PROVISIONAL, for design: the /login notice after a deletion.
 */
export const SUPPORT_EMAIL = 'support@edufurther.org';
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const SECURITY_COPY = {
  email: 'Email',
  verified: 'Verified',
  emailHint: 'Used to log in and for booking emails. To change it, contact support.',
  contactSupport: 'Contact support',
  /** The design's request to support, ready to send (owner S5: email changes go through support). */
  supportSubject: (name: string) => `Account email: please change it (${name})`,
  supportBody: (p: { name: string; firstName: string; email: string; mentor: boolean }) =>
    [
      'Hi EduFurther team,',
      '',
      'Please change the email on my account.',
      '',
      'New email: ',
      '',
      `Name: ${p.name}`,
      `Account email: ${p.email}`,
      `Role: ${p.mentor ? 'Mentor' : 'Mentee'}`,
      '',
      'Thanks,',
      p.firstName,
      // CRLF: line breaks in a mailto body (RFC 6068).
    ].join('\r\n'),
  howYouLogIn: 'How you log in',
  viaGoogle: (email: string) => `With Google (${email}).`,
  viaCode: (email: string) => `With a 6-digit code sent to ${email}.`,
  alsoCode: 'You can also log in with a code sent to this email.',
  deleteHeading: 'Delete account',
  deleteBodyMentee:
    'Deletes your profile, goals, bookings and messages. You have 30 days to restore it through support.',
  deleteBodyMentor:
    'Deletes your profile, reviews, bookings and messages. You have 30 days to restore it through support. Need time off?',
  busyLink: 'Set yourself as busy',
  busyAfter: 'instead.',
  deleteButton: 'Delete account',
  modalTitle: 'Delete your account?',
  /**
   * Counts only (sessions not yet started, and requests awaiting an answer,
   * which the backend withdraws or declines); no session sentence at 0.
   */
  deleteWarn: (mentor: boolean, sessions: number, requests = 0) => {
    const parts = [
      ...(sessions > 0 ? [`${sessions} upcoming ${plural(sessions, 'session', 'sessions')}`] : []),
      ...(requests > 0 ? [`${requests} ${plural(requests, 'request', 'requests')}`] : []),
    ];
    // One person or several is unknown (/me sends counts only): one booking
    // names "your mentor"; several say "the mentor on each", true either way.
    const n = sessions + requests;
    const told = mentor
      ? plural(n, 'the mentee', 'the mentee on each')
      : plural(n, 'your mentor', 'the mentor on each');
    const sessionLine = parts.length
      ? `Your ${parts.join(' and ')} will be canceled and ${told} told. `
      : '';
    const hidden = mentor
      ? 'Your profile, reviews and messages are hidden right away.'
      : 'Your goals, bookings and messages are hidden right away, and unused credits are lost.';
    return `${sessionLine}${hidden} Contact support within 30 days to restore your account. After that, it’s deleted permanently.`;
  },
  typeToConfirm: 'Type DELETE to confirm',
  confirmWord: 'DELETE',
  keep: 'Keep my account',
  confirm: 'Delete my account',
  deleting: 'Deleting…',
  // Ours (the design draws no failure): what failed, what's safe, what to do.
  failed: 'We couldn’t delete your account. Nothing has changed. Try again.',
  offline: 'You’re offline. Your account wasn’t deleted. Try again when you’re connected.',
  wrongWord: 'Type DELETE in capital letters to confirm.',
  // PROVISIONAL (PRD wording, not in a design file yet): /login?deleted=1.
  deletedNotice: 'Your account is deleted. Contact support within 30 days to restore it.',
} as const;
