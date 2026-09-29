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

/** One of the mentor's own session types, as the management list shows it. */
export type OwnSessionType = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  noticeMin: number;
  /** Live (bookable) or hidden. Backend `is_active`. */
  isLive: boolean;
  /** Catalog offerings, in the mentor's order, at most 3 (backend #9). */
  topics: { code: string; label: string }[];
  /** The icon to draw: the mentor's pick, else automatic from the topic. */
  icon: SessionIcon;
  /** The mentor's pick; null = automatic. */
  iconChoice: SessionIcon | null;
  /** Intake questions on the form; null when the count couldn't be loaded. */
  questionCount: number | null;
};

/** Delete refused because sessions are still booked on it (backend #4). */
export type DeleteError = AppError & { bookedCount?: number; hasBookings?: boolean };
