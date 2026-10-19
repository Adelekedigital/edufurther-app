/** Settings › Profile's editable values for a mentee (Mentee Settings.dc.html `mp`). */
export type MenteeProfileValues = {
  name: string;
  /** The catalog id of the country they live in; '' for none. */
  countryId: string;
  languages: { id: string; label: string }[];
  bio: string;
  /** The bio is still an untouched AI draft. */
  bioDrafted: boolean;
};

/** How an account logs in, for Settings › Login and security (passwordless: the email code always works). */
export type LoginProvider = 'google' | 'email';
