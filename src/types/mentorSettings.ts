/** Settings › Profile's editable values for a mentor (Mentor Settings.dc.html `profile`). */
export type MentorProfileValues = {
  name: string;
  headline: string;
  about: string;
  /** The About is still an untouched AI draft. */
  aboutDrafted: boolean;
  /** Catalog country ids; '' for none. */
  originId: string;
  studyId: string;
  /** Free text as stored ('' for none); never shown publicly. */
  gender: string;
  languages: { id: string; label: string }[];
};
