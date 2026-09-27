/** Domain types. Components are typed on these, never on the wire shape. */

export type Topic = {
  /** The backend's offering slug (catalog `code`). */
  slug: string;
  label: string;
};

/** Max one per card, highest priority first. Rules: lib/api/data/labels.ts. */
export type MentorLabel = 'top-rated' | 'experienced' | 'rising';

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
  tone: AvatarTone;
  /** "MSc, Computer Science" — null when the mentor has no degree on file. */
  degreeLine: string | null;
  institution: string | null;
  completedSessions: number;
  reviewCount: number;
  /** Mean session value, 1..5. Null when there are no published reviews. */
  rating: number | null;
  label: MentorLabel | null;
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
  'offline' | 'unauthorized' | 'forbidden' | 'notFound' | 'validation' | 'server' | 'unknown';

export type AppError = {
  kind: AppErrorKind;
  /** Safe to show a user. Never the server's `detail`. */
  message: string;
  status?: number;
};

// ---- Booking (phase A: mocked in lib/api/data/booking.ts) -------------------

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
  kind: 'text' | 'file';
  required: boolean;
};

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
  answers: Record<string, string>;
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
  /** Signed in, but /me failed (server or network): member chrome plus a retry. */
  | { kind: 'error'; retry: () => void }
  | {
      kind: 'member';
      id: string;
      firstName: string;
      initial: string;
      /** A goal row exists (backend: can book). Null goal = not onboarded yet. */
      isMentee: boolean;
      /** An approved mentor profile exists. `primary_role` is never used for this. */
      isApprovedMentor: boolean;
      /** Sessions had as a mentee; drives the match prompt (≤ 2 → shown). */
      completedSessions: number;
      /** Null for users without a mentee goal (no credit block). */
      credits: { balance: number; allowance: number; state: CreditState } | null;
    };

export type CreditState = 'on_track' | 'moderate' | 'low' | 'exhausted';
