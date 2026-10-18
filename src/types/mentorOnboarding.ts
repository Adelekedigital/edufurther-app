/** Mentor onboarding's steps (Mentor Onboarding.dc.html `flowShape=lite`). */
export type MentorStep = 'help' | 'education' | 'about' | 'hours';

/** The server's `last_step` names for them (PRD B2, `PUT /me/onboarding`). */
export type MentorStepName = `mentor_${MentorStep}`;

/** One school as the education step edits it. Years are strings ('' = not picked). */
export type SchoolDraft = {
  /** Stable React key; the saved id when there is one. */
  key: string;
  /** The saved education entry, or null for one not saved yet. */
  id: string | null;
  school: string;
  /** The catalogue institution picked from the suggestions, or null for a typed school. */
  institutionId: string | null;
  /** The catalogue school's country (shown "In {country}"), or null. */
  catalogCountryId: string | null;
  /** The country picked for an unknown school, or after "Change". '' = none. */
  countryId: string;
  /** "Change" was pressed on a catalogue school's country: the picker shows. */
  countryOpen: boolean;
  /** A MENTOR_DEGREES value, or ''. */
  degree: string;
  field: string;
  start: string;
  end: string;
  /** "This is my current or most recent education" (one school only). */
  current: boolean;
};

/** Everything the four steps hold, rebuilt from the server on load (PRD F1). */
export type MentorAnswers = {
  helpIds: string[];
  schools: SchoolDraft[];
  photoUrl: string | null;
  originId: string;
  linkedin: string;
  about: string;
  /** The About is an untouched AI draft ("Drafted for you"). */
  aboutDrafted: boolean;
  /** The writing assistant's prompt version for a fresh draft (saved with it); null otherwise. */
  aboutPromptVersion: string | null;
  /** Picked days, Monday first (0 = Monday … 6 = Sunday), as the design draws them. */
  days: number[];
  /** Minutes from midnight; `to` may be 1440 (midnight). */
  from: number;
  to: number;
  timeZone: string;
  /** The zone couldn't be read from the device or the server: UTC, with the note. */
  timeZoneFallback: boolean;
};

/** Where the applicant stands, read with the answers. */
export type MentorApplicationState = {
  answers: MentorAnswers;
  /** The last step saved, or null when they never saved one (fresh start). */
  lastStep: MentorStep | null;
  /** A mentor profile exists (step 1 has been saved at least once). */
  hasProfile: boolean;
  /** Submitted and not yet decided (PENDING BACKEND B2 `submitted_at`). */
  submitted: boolean;
  approvalStatus: 'pending' | 'approved' | 'declined' | null;
  /** The one-time approved screen was seen (PENDING BACKEND B1 `approved_seen_at`). */
  approvedSeen: boolean;
  /** An "Intro chat" session type already exists: step 4 never makes a second. */
  hasIntroChat: boolean;
  firstName: string;
  email: string;
  /** The member's handle (`slug`), which the avatar upload is keyed by. */
  handle: string | null;
};

/** A required field the step's Continue found empty (fieldGuide=marked errors). */
export type MentorGap =
  | 'help'
  | 'education'
  | 'studyCountry'
  | 'photo'
  | 'origin'
  | 'linkedin'
  | 'linkedinFormat'
  | 'days';
