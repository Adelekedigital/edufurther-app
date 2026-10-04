/**
 * The Bookings screen's view model (`/bookings`, Bookings.dc.html).
 *
 * A *booking* is the record of a 1:1 — the API calls it a session. The booking
 * *flow* types (making one: BookingSlot, BookingRequest, IntakeAnswer…) live in
 * `types/mentor.ts`; these describe one that already exists.
 */
import type { CoverKey } from '@/lib/utils/cover';

/**
 * The coded reasons a person can actually pick on a decline, cancel or
 * withdrawal. The contract's enum has nine; the other five are system-set.
 */
export type PickableReason =
  | 'mentor_unavailable'
  | 'mentee_no_longer_needed'
  | 'scheduling_conflict'
  | 'technical_issue';

/** Which side of the session the viewer is on. One account can be both, on different rows. */
export type BookingSide = 'mentor' | 'mentee';

/**
 * The API's eight statuses, renamed to our vocabulary. `pending` is
 * `pending_mentor_approval`; `noShow` is `no_show` and means *the session* did
 * not happen, not that a named person was absent (backend reply §4).
 */
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'declined'
  | 'expired'
  | 'noShow'
  | 'withdrawn';

/** The other person on a booking. */
export type BookingParty = {
  id: string;
  /** Full name, or "Deleted user" when the account is gone. */
  name: string;
  /** First name alone, for copy that addresses them ("Notes from Amara"). */
  firstName: string;
  initials: string;
  avatarUrl: string | null;
  avatarFocus: { x: number; y: number } | null;
  deleted: boolean;
  /** Their IANA zone, for showing what time this is where they are. Null on a deleted account. */
  timeZone: string | null;
  /** Their colour, for the initials avatar — the same one their profile uses. */
  cover: CoverKey;
  /** When they marked themselves present; null means they never pressed Join. */
  joinedAt: string | null;
  /**
   * Whether they turned up. `pending` means **we do not know yet** — it is the
   * state of every party until the join window shuts, and of two migrated
   * bookings that have no participant record at all. Never read it as absence.
   */
  attendance: 'pending' | 'attended' | 'noShow' | 'leftEarly';
};

export type Booking = {
  id: string;
  status: BookingStatus;
  side: BookingSide;
  other: BookingParty;
  /**
   * Whether the viewer themselves turned up. Only the other party is modelled
   * in full; this is the one field of our own side that the UI needs, to tell
   * "nobody came" from "they didn't".
   */
  myAttendance: BookingParty['attendance'];
  /** UTC instant. Rendered in the viewer's zone, never the stored one. */
  startsAt: string;
  /** UTC instant, derived from `startsAt` + the duration. */
  endsAt: string;
  durationMin: number;
  /**
   * What the session is about: its `topic` if the mentee gave one, else the
   * name of the session type it was booked against. Null only when it has
   * neither — an older row with no type at all.
   */
  title: string | null;
  /**
   * What the mentee wrote when booking — a free note to the mentor, separate
   * from the form (backend, 2026-10-03). A migrated booking has only this.
   */
  note: string | null;
  /** The booking form in brief; null when nothing was answered. */
  answersPreview: AnswersPreview | null;
  /** When it was booked. */
  createdAt: string;
  /**
   * When a request stops waiting. Null on older migrated requests, which lapse
   * at `startsAt` instead (backend reply §3).
   */
  respondBy: string | null;
  /** The join window: 5 minutes before the start to 15 minutes after it. */
  joinOpensAt: string | null;
  joinClosesAt: string | null;
  /** How often this mentee has turned up, whole percent. Null = no data, show nothing. */
  menteeAttendanceRate: number | null;
};

/** Which tab a booking belongs to. */
export type BookingTab = 'upcoming' | 'pending' | 'history';

/** What `POST /sessions/{id}/join` gives back. */
export type JoinResult = {
  /** Where to go. Null means attendance was recorded but there is no venue. */
  meetingUrl: string | null;
};

/** The one Word type the upload accepts; spelled out because it is unreadable inline. */
type IntakeDocType =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * The booking form in brief, carried on every list row so the rows cost no
 * extra requests. The whole form is `GET /sessions/{id}/answers`.
 */
export type AnswersPreview = {
  count: number;
  first: {
    /** The question as it reads **now** (backend #350), not at booking time. */
    question: string;
    /** Plain text: what was written, the options joined, or a file's name. */
    text: string;
  };
};

/** A file a mentee answered with. The bucket is private: it is fetched, never linked. */
export type AnswerFile = {
  id: string;
  filename: string;
  /** PDF or .docx, decided from the file's bytes server-side. Declared here
   *  rather than pulled from the generated schema — this file is the view
   *  model and seven components import it. Narrow on purpose: `canPreview`
   *  leans on it. */
  contentType: 'application/pdf' | IntakeDocType;
  size: number;
  /** False once retention has removed it: say so rather than offer a dead button. */
  available: boolean;
};

/** One of the mentee's answers to the mentor's booking form. */
export type BookingAnswer = {
  questionId: string;
  /** The question's wording **as it stands now** (backend #350). */
  question: string;
  kind: 'free_text' | 'file_upload' | 'multi_choice';
  /** The question has since been dropped from the form; the answer survives. */
  retired: boolean;
  /** The answer in words: free text as written, choices joined, a file named. */
  text: string;
  file: AnswerFile | null;
};
