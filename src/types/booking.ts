/**
 * The Bookings screen's view model (`/bookings`, Bookings.dc.html).
 *
 * A *booking* is the record of a 1:1 — the API calls it a session. The booking
 * *flow* types (making one: BookingSlot, BookingRequest, IntakeAnswer…) live in
 * `types/mentor.ts`; these describe one that already exists.
 */
import type { CoverKey } from '@/lib/utils/cover';

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
};

export type Booking = {
  id: string;
  status: BookingStatus;
  side: BookingSide;
  other: BookingParty;
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
  /** What the mentee wrote when booking. The only prep material the API exposes. */
  note: string | null;
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

/** A file a mentee answered with. The bucket is private: it is fetched, never linked. */
export type AnswerFile = {
  id: string;
  filename: string;
  contentType: string;
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
