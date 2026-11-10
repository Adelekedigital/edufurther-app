import type { components } from '@/lib/api/generated/schema';

type Schemas = components['schemas'];

/**
 * Every client event PRD 30 sends, and its properties: the one place an event
 * name is spelled. `track()` takes only these, so a misspelling can't open a
 * second, half-filled funnel.
 *
 * Names and properties match what the backend reads (edufurtherBE
 * `domain/analytics_behaviour.py` and `infra/clients/posthog_reader.py`,
 * confirmed with edufurtherbe-24 on 10 Nov). Change one and a funnel goes
 * empty; never rename a live event (add, run both, migrate, remove).
 *
 * Properties are ids, enums, counts and buckets only. Never an email, a name,
 * a phone number, message text, intake answers, search text (its length) or an
 * invite code (PRD 30, Privacy).
 */

/** Where a booking was opened from (`BookingLauncher` requires one). */
export type EntryPoint = Schemas['EntryPoint'];

/** Where a profile view came from; the backend counts anything else as `other`. */
export type ProfileViewSource =
  'explore' | 'home' | 'bookings' | 'messages' | 'similar_mentors' | 'invite_link' | 'direct';

export type BookingStep = 'type' | 'time' | 'questions';
export type MentorApplicationStep = 'about_you' | 'education' | 'hours';
export type Role = Schemas['PrimaryRole'];

export type AnalyticsEvents = {
  /** One per navigation, from the router (track.ts), never from a screen. */
  $pageview: { route: string };

  // Sign-up and log-in: how many arrive, and can they get in?
  signup_started: { role?: Role };
  /** `is_migrated` only when this device already knows it (never asked of the server). */
  login_code_verified: { is_migrated?: boolean };
  login_code_failed: {
    reason: 'invalid' | 'expired' | 'rate_limited' | 'other';
    is_migrated?: boolean;
  };
  /** A Google sign-in came back: counted with `login_code_verified` as "code verified". */
  google_oauth_completed: Record<string, never>;

  // Onboarding: which step loses people?
  onboarding_step_completed: { role: Role; step: string };
  onboarding_completed: { role: Role };
  onboarding_abandoned: { role: Role; step: string };

  /**
   * An invite link was opened and the invite resolved. No referrer id: who
   * invited whom lives in Postgres; signup_source=invite comes from
   * acquisition (decided 10 Nov).
   */
  invite_viewed: Record<string, never>;

  // Explore: where is demand unmet, and what sends people to profiles?
  mentor_search_performed: { query_length: number; filter_count: number; result_count: number };
  mentor_profile_viewed: { source: ProfileViewSource };

  // Booking: which step and which surface lose bookings?
  booking_started: { entry_point: EntryPoint; is_guest: boolean };
  booking_step_completed: { step: BookingStep; entry_point: EntryPoint };
  booking_abandoned: { entry_point: EntryPoint; last_step: 'started' | BookingStep };
  /** The client half; the server sends its own with the session id (the funnel reads that one). */
  booking_requested: { entry_point: EntryPoint; session_type_id: string };

  // Mentor application: where do applicants drop?
  mentor_application_started: Record<string, never>;
  mentor_application_step_completed: { step: MentorApplicationStep };
  mentor_application_submitted: Record<string, never>;

  // New mentors: where do they stall before bookable?
  availability_set: Record<string, never>;
  session_type_created: Record<string, never>;
  conferencing_connected: Record<string, never>;
  calendar_connected: Record<string, never>;

  // Sessions: are no-shows caused by the product?
  session_join_clicked: { session_id: string; minutes_from_start: number };
  session_join_failed: { session_id: string };

  /** Feeds the messaging North Star. */
  message_sent: { conversation_id: string; is_first_in_conversation: boolean };

  /** Is the AI feature worth its cost? `outcome` is what the person did with the draft. */
  writing_assist_used: { field: string; mode: string; outcome: 'accepted' | 'discarded' };

  // Push reach.
  pwa_installed: Record<string, never>;
  push_permission_granted: Record<string, never>;

  /** Error rate by screen: the rate, never the message. */
  request_failed: { route: string; status_bucket: '4xx' | '5xx' | 'network'; kind: string };
};

export type AnalyticsEvent = keyof AnalyticsEvents;

/**
 * Set on identify, nothing else (PRD 30, Identity). The backend's role and
 * source breakdowns read these; it filters internal accounts itself.
 */
export type PersonProperties = {
  role: Role;
  signup_source?: Schemas['SignupSource'];
  signup_channel?: Schemas['SignupChannel'] | null;
  /** Once MeRead carries it (backend follow-up). */
  is_migrated?: boolean;
};
