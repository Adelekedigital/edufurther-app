/** Settings › Profile's editable values for a mentee (Mentee Settings.dc.html `mp`). */
export type MenteeProfileValues = {
  name: string;
  /** Catalogue id of where they're from (`origin_country`); '' for none. */
  originId: string;
  languages: { id: string; label: string }[];
  bio: string;
  /** The bio is still an untouched AI draft. */
  bioDrafted: boolean;
};

/** How an account logs in, for Settings › Login and security (passwordless: the email code always works). */
export type LoginProvider = 'google' | 'email';

/** A school on the mentee's list: picked from the catalogue, or typed. */
export type GoalSchool = {
  /** The catalogue row, or null for a name nothing matched. */
  institutionId: string | null;
  /** What was typed or picked; what's sent back as `school_name_raw`. */
  raw: string;
  /** What the chip shows: the catalogue's name when linked, else `raw`. */
  label: string;
};

/** Settings › Goals' editable values (Mentee Settings.dc.html `mg`). */
export type MenteeGoalValues = {
  /** A DEGREE_OPTIONS value ("mba", not the stored "masters"); '' for none. */
  degree: string;
  field: string;
  /** Catalogue ids, in priority order (at most 3). */
  countryIds: string[];
  schools: GoalSchool[];
  /** Picked help areas (catalogue offering ids). */
  needIds: string[];
};
