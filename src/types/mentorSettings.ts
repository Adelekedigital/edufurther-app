import type { SocialKind, SocialMark } from './mentor';

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

/** One row of Settings › Social links. LinkedIn's id is `linkedin`: it isn't a link row. */
export type SocialRow = {
  id: string;
  kind: SocialKind;
  /** What follows the platform's prefix: the handle, or a website's address. */
  value: string;
  /** The canonical https link, as the backend returns it. */
  url: string;
  mark: SocialMark;
};

/** Add (`id` null) or change one social link. */
export type SocialSave = { kind: SocialKind; value: string; id: string | null };
