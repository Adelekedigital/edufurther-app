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
  'mentor_unavailable' | 'mentee_no_longer_needed' | 'scheduling_conflict' | 'technical_issue';

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
  /**
   * The degree that best describes them — highest, then most recent — and where
   * it is from, as the discovery card reads a person (backend #409). Either is
   * null with no education entry, or once they have deleted their account.
   */
  degree: string | null;
  institution: string | null;
  /** When they marked themselves present; null means they never pressed Join. */
  joinedAt: string | null;
  /**
   * EduFurther video (Daily) only: the first time Daily saw them in the room
   * (backend #382). "Has been in the room", not "is in it now": leaving
   * doesn't clear it. Always null for Google Meet and a mentor's own link.
   */
  inRoomAt: string | null;
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
  /**
   * When the viewer first pressed Join; null if they haven't. Decides whether
   * Join stays open after the arrival window: only someone who has been in
   * can get back in (the door).
   */
  myJoinedAt: string | null;
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
   * The offering this was booked against. Needed to ask for the mentor's open
   * slots when they offer another time — a suggested instant must be one
   * `/slots` currently lists, exactly, or the write is a 422.
   */
  sessionTypeId: string | null;
  /**
   * What the mentee wrote when booking — a free note to the mentor, separate
   * from the form (backend, 2026-10-03). A migrated booking has only this.
   */
  note: string | null;
  /** The booking form in brief; null when nothing was answered. */
  answersPreview: AnswersPreview | null;
  /** Another time the mentor offered instead; null when none was. */
  suggestion: BookingSuggestion | null;
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
  /**
   * Until when someone who has joined can get back into the call
   * (`POST /sessions/{id}/door`): the session's end. Read it rather than
   * assume its order against `joinClosesAt`. Null: no door.
   */
  doorClosesAt: string | null;
  /**
   * Until when **the mentee** cancelling gets their credit back: the start
   * minus the deployment's refund window. Cancelling at exactly this instant
   * still refunds.
   *
   * Set on a **confirmed** session only. `null` elsewhere does **not** mean
   * "no refund" — a pending request withdrawn or declined always refunds, and
   * a finished one has nothing left to refund.
   *
   * Read rather than recomputed: the window is deployment configuration, so a
   * number in our copy would go stale the day it changes.
   */
  refundUntil: string | null;
  /** How often this mentee has turned up, whole percent. Null = no data, show nothing. */
  menteeAttendanceRate: number | null;
  /**
   * How many finished sessions the rate is measured over — its own denominator
   * (backend #409). `0` with a null rate is a new mentee, not a bad one.
   */
  menteeAttendanceSessions: number;
};

/** Which tab a booking belongs to. */
export type BookingTab = 'upcoming' | 'pending' | 'history';

/** What `POST /sessions/{id}/join` gives back. */
export type JoinResult = {
  /** Where to go. Null means attendance was recorded but there is no venue. */
  meetingUrl: string | null;
};

/** The one Word type the upload accepts; spelled out because it is unreadable inline. */
type IntakeDocType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * The booking form in brief, carried on every list row so the rows cost no
 * extra requests. The whole form is `GET /sessions/{id}/answers`.
 */
export type AnswersPreview = {
  count: number;
  first: {
    /** The wording **as asked**, stored with the answer (backend #360). */
    question: string;
    /** Plain text: what was written, the options joined, or a file's name. */
    text: string;
  };
};

/**
 * Another time a mentor offered when they declined or cancelled a booking
 * (`SessionRead.suggestion`, backend #339), as this screen reads it.
 */
/**
 * `active` while the time is held for this mentee alone; `booked` once they
 * took it; `expired` once the hold lapsed unbooked.
 *
 * The backend computes this on every read — `active` means `held_until` was
 * still ahead **when the row was fetched**. A row already in hand therefore
 * keeps saying `active` after its hold runs out, which is expected rather than
 * a bug: the clock is the truth for what to show, a re-read is the truth for
 * what it is.
 */
export type SuggestionStatus = 'active' | 'booked' | 'expired';

export type BookingSuggestion = {
  id: string;
  /** UTC instant. Rendered in the viewer's zone, never the stored one. */
  startsAt: string;
  /** UTC instant, derived from `starts_at` + `duration_minutes`, as `Booking.endsAt` is. */
  endsAt: string;
  durationMin: number;
  /** UTC instant the exclusive hold ends — two hours from the offer. */
  heldUntil: string;
  status: SuggestionStatus;
  /** The session it became, once `booked`. */
  bookedSessionId: string | null;
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
  /**
   * The wording **as asked**, kept with the answer since backend #360.
   * Answers from before it fall back to the question's current wording.
   */
  question: string;
  kind: 'free_text' | 'file_upload' | 'multi_choice';
  /** The question has since been dropped from the form; the answer survives. */
  retired: boolean;
  /**
   * The mentee answered it. `false` means the question **was asked and left
   * blank** — which is not the same as missing data, and is shown as
   * "No answer" (backend #412).
   *
   * A booking's form is kept as it stood when it was made, so every question
   * asked is listed, in that order. Bookings made before the form was kept
   * list only their answers, every one `true`.
   */
  answered: boolean;
  /**
   * Whether the question was required when the booking was made. Null for a
   * booking made before the form was kept — so null means "we cannot know",
   * never "optional".
   */
  required: boolean | null;
  /** The answer in words: free text as written, choices joined, a file named. */
  text: string;
  file: AnswerFile | null;
};

/** Where a session happens, as the API names it (`MeetingProvider`). `daily` is EduFurther video. */
export type MeetingProvider = 'daily' | 'google_meet' | 'zoom' | 'custom';

/**
 * One session as the join page reads it (Session Join.dc.html). The page shows
 * both people side by side, so the viewer's own party is modelled in full
 * here, which `Booking` deliberately does not do.
 */
export type SessionRoom = {
  booking: Booking;
  me: BookingParty;
  /** The offering's name ("1:1 call"); null on an older row with no type. */
  typeName: string | null;
  /** Null on an older row with no venue recorded. */
  provider: MeetingProvider | null;
};
