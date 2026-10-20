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
