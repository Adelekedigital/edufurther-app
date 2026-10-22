/** Domain types. Components are typed on these, never on the wire shape. */

import type { CoverArt, CoverKey } from '@/lib/utils/cover';

export type Topic = {
  /** The backend's offering slug (catalog `code`). */
  slug: string;
  label: string;
  /** The offering's id, for writes (session types' `service_offering_ids`). */
  id?: string;
};

/** Max one per card, highest priority first. Rules: lib/api/data/labels.ts. */
export type MentorLabel = 'top-rated' | 'experienced' | 'new';

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
  /** Their colour (`personCover`): the initials and the photo ground take its deep tone. */
  cover: CoverKey;
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
  /**
   * False: listed, but nobody can book them now (no active session type, or no
   * weekly hours). The card says so and offers the profile, not Book.
   */
  takingBookings: boolean;
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
  /**
   * The three mentee booking limits (backend #342). None of them is about the
   * time, so none of them is fixed by picking another one — which is why they
   * are separate kinds rather than a plain `conflict`.
   */
  | 'bookingOverlap'
  | 'bookingWithMentorExists'
  | 'bookingLimitReached'
  /**
   * 409 `/problems/booking-needs-onboarding`: the mentee hasn't finished
   * onboarding. The booking flow shows the finish-setup box, not an error.
   */
  | 'needsOnboarding'
  /** 409 `/problems/mentor-application-in-review`: frozen until the decision. */
  | 'inReview'
  /** 429: the server is asking for a pause, and says how long (backend #358). */
  | 'rateLimited'
  | 'server'
  | 'unknown';

export type AppError = {
  kind: AppErrorKind;
  /** Some of a multi-request save went through (e.g. a few weekly hours): the message says so. */
  partial?: boolean;
  /** Safe to show a user. Never the server's `detail`. */
  message: string;
  status?: number;
  /** `Retry-After` in seconds, on a 429. Carried so the copy can say when. */
  retryAfter?: number;
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
  /**
   * Booking it is a request the mentor accepts (true), or confirms at once
   * (false): the offering's setting, else its mentor's (backend-resolved).
   * Absent in older fixtures: a request.
   */
  requiresConfirmation?: boolean;
  /**
   * How many days ahead it can be booked (its effective window). Absent only
   * in older fixtures: the modal then shows its default four weeks.
   */
  windowDays?: number;
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
/** Where a mentor application stands (/me mentor_profile), as toMentorApplication reads it. */
export type MentorStage = 'none' | 'unsubmitted' | 'pending' | 'approved' | 'declined';

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
      /** Two letters, first and last name (`personInitials`); the email's first letter with neither. */
      initials: string;
      /** A goal row exists (backend: can book). Null goal = not onboarded yet. */
      isMentee: boolean;
      /** An approved mentor profile exists. `primary_role` is never used for this. */
      isApprovedMentor: boolean;
      /**
       * A mentor profile exists in any state (pending, approved, paused…). Gets the
       * mentor navigation and may manage session types (backend reply #6).
       */
      isMentor: boolean;
      /**
       * Signed up as a mentor (`primary_role` mentor) with no mentor profile
       * yet: onboarding and Home continue as a mentor. Never a permission.
       */
      signedUpAsMentor?: boolean;
      /** Any mentor profile row, including a declined one a mentee-by-choice keeps. */
      hasMentorProfile?: boolean;
      /** An onboarding step was saved (`/me` onboarding.last_step), mentee or mentor. */
      onboardingStarted?: boolean;
      /**
       * An approved mentor has been shown the approved screen (`/me`
       * `approved_seen_at`, PRD B2). Absent: not known, treated as seen.
       */
      mentorApprovedSeen?: boolean;
      /**
       * Where the mentor application stands (`/me` mentor_profile
       * `approval_status` and `submitted_at`, read as toMentorApplication does).
       * `none` for a mentee, including a declined applicant who chose mentee.
       * Absent: not known, treated as approved (no setup lock).
       */
      mentorStage?: MentorStage;
      /**
       * Onboarding is finished (`/me` onboarding.complete; a mentee migrated
       * from the old platform counts as finished). Absent: not known, treated
       * as finished (no setup lock).
       */
      onboardingComplete?: boolean;
      /** The mentor profile appears in search (`listing_status` listed). Absent: not known. */
      isListedMentor?: boolean;
      /** The account's IANA zone (`/me` timezone): the backend judges "today" in it (return dates). */
      timeZone?: string;
      /** Sessions had as a mentee; drives the match prompt (≤ 2 → shown). */
      completedSessions: number;
      /** When the account was made (`/me` created_at). Absent: not known. */
      createdAt?: string;
      /** Null for users without a mentee goal (no credit block). */
      credits: {
        /** Everything spendable: monthly + bonus. */
        balance: number;
        state: CreditState;
        /** When the monthly credits reset (backend `next_reset_at`, midnight UTC). */
        nextResetAt?: string | null;
        /** `expiresAt` null: none held, or none of those held expire. */
        monthly: {
          balance: number;
          ceiling: number;
          expiresAt: string | null;
          /** Whether the account gets the monthly grant (a goal + an invite unlock). */
          unlocked: boolean;
        };
        /** Starter, invite and support grants; groups soonest expiry first. */
        bonus: { balance: number; groups: { count: number; expiresAt: string | null }[] };
      } | null;
      // The sidebar's avatar and badge. Optional so hand-built test viewers
      // needn't list them; absent reads as none.
      /** Profile photo (backend `profile.avatar_url`); none shows the initial. */
      avatarUrl?: string | null;
      /** Where the face is in the photo (0–1 each way). */
      avatarFocus?: { x: number; y: number } | null;
      /** Saved cover colour; none falls back to coverFor(id), as the profile does. */
      coverKey?: CoverKey | null;
      /**
       * Booking requests awaiting a response, for the Bookings badge (product
       * 2026-09-30): as mentor, the ones waiting on them; as mentee, theirs
       * waiting on the mentor. Null when /me has no count for that role.
       */
      awaitingResponse?: number | null;
      /**
       * The Bookings tabs' counts, both sides added together (backend reply
       * §10). Distinct from `awaitingResponse`, which is one side only because
       * the nav badge follows the viewer's role.
       */
      bookingCounts?: { pending: number | null; upcoming: number | null };
      /**
       * How many hours before the start a mentee may cancel and still get the
       * credit back — the deployment's window. For copy that explains the rule
       * with no session to hand; a session's own deadline is its `refundUntil`.
       */
      menteeCancelRefundHours?: number | null;
    };

export type CreditState = 'on_track' | 'moderate' | 'low' | 'exhausted';

// ---- Mentor profile (GET /api/v1/mentors/{handle}) ----------------------------

/**
 * Where a social link points: LinkedIn (`social_linkedin`), or one of the
 * user's links (backend LinkPlatform, #507).
 */
export type SocialKind =
  'linkedin' | 'x' | 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'website';
/** The mark a link shows: a website on Medium or Substack shows theirs (the design's DETECT). */
export type SocialMark = SocialKind | 'medium' | 'substack';

/** A bookable offering as the profile shows it (category, stage). */
export type ProfileSessionType = SessionType & {
  /** The offering's help category, e.g. "Visa and interview". */
  category: string | null;
  /** Application stage it suits, e.g. "Drafting". */
  stage: string | null;
};

/** A step towards a complete profile (backend `completeness.missing`, owner-only). */
export type CompletenessCode =
  | 'photo'
  | 'headline'
  | 'about'
  | 'topics'
  | 'background'
  | 'education'
  | 'award'
  | 'session_type'
  | 'weekly_hours';
export type Completeness = { percent: number; missing: CompletenessCode[] };

export type ProfileItem = { id: string; title: string; meta: string | null };

export type AwardFunding = 'full' | 'partial';
/** An award as its edit form holds it (ProfileItemModal.dc.html `award`). */
export type AwardValues = {
  title: string;
  org: string;
  year: number | null;
  /** null: not said ("Not shown"). */
  funding: AwardFunding | null;
};
/** A degree as its edit form holds it (ProfileItemModal.dc.html `education`). */
export type EducationValues = {
  school: string;
  /** The abbreviation (PhD, MSc…), or "Other". */
  degree: string;
  course: string;
  start: number;
  end: number;
  /** "This is my current or most recent education". */
  current: boolean;
};
/** A degree from the owner's own read, with the dates as saved. */
export type EducationEntry = {
  id: string;
  values: EducationValues;
  dateStart: string | null;
  dateEnd: string | null;
  /** The saved level id, kept when the degree isn't changed. */
  levelId: string | null;
  /** The saved level's name (Bachelor’s), for a degree saved without an abbreviation. */
  levelName: string | null;
};

/** A Scholarships and awards row, with what the owner's editor starts from. */
export type AwardItem = ProfileItem & { funding: AwardFunding | null; values: AwardValues };

export type MentorProfile = {
  /** The card-shaped mentor: header basics, proof line, BookingFlow. */
  mentor: Mentor;
  /** The names as stored (first and last apart), for the owner's edit form. */
  names: { first: string; last: string };
  /** Bookable right now (backend #301); false shows "Not taking bookings". */
  takingBookings: boolean;
  headline: string | null;
  about: string | null;
  /** The About is still an untouched AI draft ("Drafted for you"). */
  aboutDrafted: boolean;
  bannerUrl: string | null;
  /** The mentor's chosen cover (null colour: the automatic one) and cover art. */
  cover: {
    color: CoverKey | null;
    art: CoverArt;
  };
  originCountry: string | null;
  studyCountry: string | null;
  languages: string[];
  /** The same background by id, for the owner's editor (the writes take ids). */
  background: {
    originId: string | null;
    studyId: string | null;
    languages: { id: string; label: string }[];
  };
  /** Only links that passed lib/utils/socialUrl. */
  socials: { mark: SocialMark; href: string }[];
  education: ProfileItem[];
  awards: AwardItem[];
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
  owner: {
    approval: 'pending' | 'approved' | 'declined' | null;
    listed: boolean;
    /** What stops them taking bookings (backend `setup_needed`, owner-only). */
    setupNeeded?: ('session_type' | 'weekly_hours')[];
    /** How complete the profile is, and what to do next, in order (Profile strength). */
    completeness?: Completeness;
  } | null;
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
  /**
   * What the reviews were about (backend `review_topics`), most reviewed first.
   * `count` is what the topic's filter pages through; a review about two topics
   * counts under both, so these never read as shares of `count`.
   */
  topics: ReviewTopicCount[];
};

/** A service offering a review was about (backend `service_offerings`). */
export type ReviewTopic = { slug: string; name: string };
export type ReviewTopicCount = ReviewTopic & { count: number };

export type Review = {
  id: string;
  /** "Aladi P.", or "Deleted user". */
  author: string;
  initials: string;
  institution: string | null;
  createdAt: string;
  /** 1..5. */
  rating: number;
  /** What it was about, in the mentor's order; empty for a migrated review. */
  topics: ReviewTopic[];
  /** The session type it was for, when known: the tag when there are no topics. */
  sessionType: string | null;
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
/**
 * The review note on a mentor's Reviews tab: none yet (no session), due
 * ("Write a review"), or an update due (a new review, P6: 60+ days and 2+
 * sessions since the last one), with when that last one was. Null: nothing.
 */
export type ReviewPrompt = 'none' | 'due' | { kind: 'again'; lastReviewedAt: string } | null;

/** A prompt that leads to writing a review (a first one, or an update). */
export const promptWrites = (p: ReviewPrompt): boolean =>
  p === 'due' || (p !== null && typeof p === 'object');

// ---- Writing a review (POST /reviews, PATCH /reviews/{id}) -------------------

/** The four attribute rows' scale (ReviewModal.dc.html "Poor / Okay / Great"). */
export type AttributeScore = 'poor' | 'okay' | 'great';

/** Everything the review flow collects. */
export type ReviewAnswers = {
  /** Step 1 stars, 1–5: the overall rating cards average. */
  overall: number;
  /** Shown on the profile. */
  text: string;
  communication: AttributeScore;
  knowledge: AttributeScore;
  support: AttributeScore;
  practicality: AttributeScore;
  /** "How much did this session move you toward your study abroad goals?" 1–5. */
  value: number;
  /** "How likely are you to recommend {first}?" 1–10. */
  recommend: number;
  /** "How could EduFurther work better for you?" Private; only the team sees it. */
  platformNote: string;
};

/** A completed session the viewer may review. */
export type ReviewableSession = { id: string; startsAt: string; typeName: string | null };

/** The viewer's own review of a mentor. */
export type MyReview = {
  id: string;
  createdAt: string;
  /** Null once the edit window has shut. */
  editableUntil: string | null;
  /** Whatever the API returns; everything while the edit window is open. */
  answers: Partial<ReviewAnswers>;
};
