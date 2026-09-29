/** Domain types. Components are typed on these, never on the wire shape. */

export type Topic = {
  /** The backend's offering slug (catalog `code`). */
  slug: string;
  label: string;
  /** The offering's id, for writes (session types' `service_offering_ids`). */
  id?: string;
};

/** Max one per card, highest priority first. Rules: lib/api/data/labels.ts. */
export type MentorLabel = 'top-rated' | 'experienced' | 'new';

/** 1–6, an index into the --avatar-tone-* tokens. */
export type AvatarTone = 1 | 2 | 3 | 4 | 5 | 6;

export type Mentor = {
  id: string;
  /** Where the name and photo link to. */
  profileHref: string;
  name: string;
  firstName: string;
  initials: string;
  photoUrl: string | null;
  /**
   * Where the face is in the photo, as 0–1 fractions (backend avatar_focus, #240).
   * The crop is anchored on it (object-position); null → the design's 50% 25%.
   */
  photoFocus: { x: number; y: number } | null;
  tone: AvatarTone;
  /** "MSc, Computer Science" — null when the mentor has no degree on file. */
  degreeLine: string | null;
  institution: string | null;
  completedSessions: number;
  reviewCount: number;
  /** Mean session value, 1..5. Null when there are no published reviews. */
  rating: number | null;
  label: MentorLabel | null;
  /** Where they grew up / where they studied (display names), for "Moved from X to Y". */
  originCountry?: string | null;
  studyCountry?: string | null;
  /**
   * What booking costs, for the card's offer line. "free" = at least one free
   * session type. Null = unknown (line hidden). Paid ("from $X") waits for prices.
   */
  offer: 'free' | null;
  /** Next free slot (UTC ISO), or null. Null alone does not mean "none" — see nextAvailableState. */
  nextAvailableAt: string | null;
  /**
   * open: nextAvailableAt is set. none: known to have nothing open ("No open times
   * at the moment"). unknown: not recomputed yet or not reported — say nothing.
   */
  nextAvailableState: 'open' | 'none' | 'unknown';
  topics: Topic[];
};

/** The "Featured this week" mentor: a Mentor plus the public bio the card shows (null: none written). */
export type FeaturedMentor = Mentor & { bio: string | null };

export type AppErrorKind =
  | 'offline'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'validation'
  /** 409 that passes on its own (a slot taken meanwhile, a request in flight). */
  | 'conflict'
  /** 409 `/problems/insufficient-credit`: retrying will not help. */
  | 'noCredit'
  | 'server'
  | 'unknown';

export type AppError = {
  kind: AppErrorKind;
  /** Safe to show a user. Never the server's `detail`. */
  message: string;
  status?: number;
};

/** One fetched value as a view sees it: the page passes these down. */
export type Remote<T> = {
  data: T | null;
  isLoading: boolean;
  error: AppError | null;
  retry: () => void;
};

// ---- Booking (lib/api/data/booking.ts) ---------------------------------------

export type SessionType = {
  id: string;
  name: string;
  durationMin: number;
  description: string;
  /** What the mentor asks before the session. */
  questions: IntakeQuestion[];
};

export type IntakeQuestion = {
  id: string;
  label: string;
  /** text: prose; single / multi: choose from `options`; file: a PDF or Word upload. */
  kind: 'text' | 'single' | 'multi' | 'file';
  required: boolean;
  options: { id: string; label: string }[];
};

/** An uploaded intake file (POST /me/intake-files), sent as the answer's `file_id`. */
export type IntakeFile = { id: string; name: string; size: number };

/** One answer, by question id. Exactly one form is used per question kind. */
export type IntakeAnswer = { text?: string; optionIds?: string[]; file?: IntakeFile };

export type BookingDay = {
  /** ISO date in the viewer's zone, e.g. 2026-09-28. */
  date: string;
  slots: BookingSlot[];
};

export type BookingSlot = {
  /** UTC instant. */
  startsAt: string;
};

export type BookingRequest = {
  mentorId: string;
  sessionTypeId: string;
  startsAt: string;
  answers: Record<string, IntakeAnswer>;
};

/** Who is looking (GET /api/v1/me; backend auth reply #3). */
export type Viewer =
  /**
   * Not known yet. `signedIn`: null while the session itself is unknown (render
   * neither guest nor member chrome); true while /me is on its way.
   */
  | { kind: 'loading'; signedIn: boolean | null }
  | { kind: 'guest' }
  /**
   * Signed in, but the backend has no account for this identity yet (/me 404:
   * there is no self-signup; backend auth reply, 2026-09-27). Not a guest, not a member.
   */
  | { kind: 'unlinked' }
  /**
   * Signed in with an email that already belongs to an EduFurther account not
   * linked to this sign-in (/me 409 /problems/account-exists, backend PR #238).
   * Only support can link them.
   */
  | { kind: 'accountExists' }
  /** Signed in, but /me failed (server or network): member chrome plus a retry. */
  | { kind: 'error'; retry: () => void; retrying: boolean }
  | {
      kind: 'member';
      id: string;
      firstName: string;
      initial: string;
      /** A goal row exists (backend: can book). Null goal = not onboarded yet. */
      isMentee: boolean;
      /** An approved mentor profile exists. `primary_role` is never used for this. */
      isApprovedMentor: boolean;
      /**
       * A mentor profile exists in any state (pending, approved, paused…). Gets the
       * mentor navigation and may manage session types (backend reply #6).
       */
      isMentor: boolean;
      /** Sessions had as a mentee; drives the match prompt (≤ 2 → shown). */
      completedSessions: number;
      /** Null for users without a mentee goal (no credit block). */
      credits: { balance: number; allowance: number; state: CreditState } | null;
    };

export type CreditState = 'on_track' | 'moderate' | 'low' | 'exhausted';

// ---- Mentor profile (GET /api/v1/mentors/{handle}) ----------------------------

export type SocialKind = 'linkedin' | 'x' | 'youtube';

/** A bookable offering as the profile shows it (category, stage, venue). */
export type ProfileSessionType = SessionType & {
  /** The offering's help category, e.g. "Visa and interview". */
  category: string | null;
  /** Application stage it suits, e.g. "Drafting". */
  stage: string | null;
  /** Where it happens, e.g. "Google Meet". */
  venue: string;
};

export type ProfileItem = { id: string; title: string; meta: string | null };

export type MentorProfile = {
  /** The card-shaped mentor: header basics, proof line, BookingFlow. */
  mentor: Mentor;
  headline: string | null;
  about: string | null;
  bannerUrl: string | null;
  originCountry: string | null;
  studyCountry: string | null;
  languages: string[];
  /** Only links that passed lib/utils/socialUrl. */
  socials: { kind: SocialKind; href: string }[];
  education: ProfileItem[];
  awards: ProfileItem[];
  sessionTypes: ProfileSessionType[];
  mentoringMinutes: number;
  menteesMentored: number;
  /** Whole-number percentage, or null. */
  attendanceRate: number | null;
  reviews: ReviewSummary;
  /**
   * Present only when the viewer is this mentor (backend mentor-profile reply
   * #1): the owner sees their page in any state.
   */
  owner: { approval: 'pending' | 'approved' | 'declined' | null; listed: boolean } | null;
};

// ---- Reviews (GET /api/v1/mentors/{handle}/reviews) ---------------------------

export type ReviewAttribute = 'communication' | 'knowledge' | 'support' | 'practicality';

/** The profile's review summary (MentorPublicRead.reviews). */
export type ReviewSummary = {
  count: number;
  /** Mean session value, 1..5; null with no published reviews. */
  rating: number | null;
  /** Share of mentees scoring 8+ of 10, as "n in 10" (0–10); null → the box hides. */
  wouldRecommendIn10: number | null;
  /** Whole-number percentages per attribute; null when not rated yet. */
  attributes: Record<ReviewAttribute, number | null>;
};

export type Review = {
  id: string;
  /** "Aladi P.", or "Deleted user". */
  author: string;
  initials: string;
  institution: string | null;
  createdAt: string;
  /** 1..5. */
  rating: number;
  /** The session type it was for, when known. */
  topic: string | null;
  text: string;
};

/** A row of Mentor Profile.dc.html's "Similar mentors" card. */
export type SimilarMentor = {
  mentor: Mentor;
  /** "MA, Leipzig University": degree and school; null when neither is on file. */
  meta: string | null;
  /** The offering they share with this profile ("Also helps with {it}"). */
  sharedTopic: string;
};

/**
 * What the viewer can do about reviewing this mentor (GET /me/mentors/{id}/relationship).
 * none: no session together yet. due: a review is owed. Null: nothing to say.
 */
export type ReviewPrompt = 'none' | 'due' | null;
