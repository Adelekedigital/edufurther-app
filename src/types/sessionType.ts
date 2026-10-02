import type { AppError } from './mentor';

/** The design's session icon set (backend SessionTypeIcon, #18), in the design's order. */
export const SESSION_ICONS = [
  'video_call',
  'edit_document',
  'find_in_page',
  'school',
  'payments',
  'record_voice_over',
  'quiz',
  'badge',
  'lightbulb',
] as const;
export type SessionIcon = (typeof SESSION_ICONS)[number];

/** Where a mentee is in their application (backend ApplicationStage). `other` = the mentor's own words. */
export type ApplicationStage =
  | 'early_exploration'
  | 'drafting_stage'
  | 'post_submission'
  | 'revisions'
  | 'interviewing'
  | 'other';

/** One of the mentor's own session types, as the management list shows it. */
export type OwnSessionType = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  noticeMin: number;
  /** Live (bookable) or hidden. Backend `is_active`. */
  isLive: boolean;
  /**
   * Books into its own scheduling windows, not the mentor's Calendar hours
   * (backend #329, `uses_own_windows`).
   */
  usesOwnWindows: boolean;
  /** The stages it's aimed at, in the mentor's order; empty = any stage. */
  stages: ApplicationStage[];
  /** The mentor's own words for the `other` stage, or null. */
  customStage: string | null;
  /** Catalog offerings, in the mentor's order, at most 3 (backend #9). */
  topics: { code: string; label: string }[];
  /** The icon to draw: the mentor's pick, else automatic from the topic. */
  icon: SessionIcon;
  /** The mentor's pick; null = automatic. */
  iconChoice: SessionIcon | null;
  /** Intake questions on the form; null when the count couldn't be loaded. */
  questionCount: number | null;
  /** Shown first on the profile; one per mentor (backend round 4). */
  isFeatured: boolean;
  /** Deleted after its last booked session; hidden meanwhile (backend round 4). */
  pendingDeletion: { deletesAfter: string | null; bookedCount: number } | null;
  /** Sessions booked on it now and when the last one ends: whether Delete deletes or schedules. */
  booked: { count: number; lastEndsAt: string | null };
};

export type DeleteError = AppError;

/** What a DELETE did: gone, or hidden now and deleted after its last booked session. */
export type DeleteResult =
  | { kind: 'deleted' }
  | { kind: 'scheduled'; deletesAfter: string | null; bookedCount: number }
  /** No answer in time: it may or may not have gone through (the list is refetched). */
  | { kind: 'unknown' };
