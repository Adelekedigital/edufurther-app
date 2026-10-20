/**
 * Mentor Settings (Mentor Settings.dc.html, PRD 19 Oct). Copy reviewed with
 * edufurther-ux-writer, 2026-10-19.
 */

/** The screen's subline for a mentor (design `mentorView`). */
export const MENTOR_SETTINGS_SUB = 'Manage how mentees book you and what they see on your profile.';

export const BOOKING_COPY = {
  approveTitle: 'Approve bookings',
  approveOn: 'You decide which requests to accept.',
  approveOff: 'Mentees book any available time and it’s confirmed straight away.',
  approveFootnote: 'Mentees see “Needs your approval” before they book.',
  rulesTitle: 'Booking rules',
  rulesSub:
    'You control when mentees can book you. Change these for any single session in Sessions.',
  rules: {
    durationMin: { label: 'Session length', hint: 'How long each booking lasts.' },
    noticeHours: {
      label: 'Minimum notice',
      hint: 'How much notice you need before a session is booked.',
    },
    windowDays: { label: 'Booking window', hint: 'How far in advance mentees can book you.' },
    breakMin: { label: 'Buffer between sessions', hint: 'Time kept free after each booking.' },
  },
  loadError: 'We couldn’t load your booking rules. Check your connection and try again.',
  retry: 'Try again',
  saveBar: 'Unsaved changes to booking rules',
  saved: 'Changes saved',
  /** Ours: the hook's own copy says "preferences", which isn't our word for these. */
  saveFailed: 'Your booking rules didn’t save. Your changes are still here. Try again.',
  saveOffline: 'You’re offline. Your changes are still here. Try again when you’re connected.',
} as const;

/**
 * Replaces the design's "If you don't respond in time" picker (founder, Oct
 * 19: no auto-confirm). An unanswered request expires `hours` before the
 * session (the platform's RESPONSE_WINDOW_HOURS), shown as Unconfirmed, and
 * both sides are notified (request_expired). Without the setting, no number.
 */
export function noResponseLine(hours: number | null): string {
  return hours
    ? `If you don’t respond by ${hours} ${hours === 1 ? 'hour' : 'hours'} before the session, the request expires and the mentee will be informed.`
    : 'If you don’t respond in time, the request expires and the mentee will be informed.';
}

/** The note under the rules; the count is left out when it's 0 or couldn't load. */
export function rulesNote(sessionsUsingRules: number | null): string {
  const after =
    'Once you save, changes apply to new bookings. Sessions already booked stay as they are.';
  if (!sessionsUsingRules) return after;
  const count =
    sessionsUsingRules === 1
      ? '1 of your sessions uses these rules.'
      : `${sessionsUsingRules} of your sessions use these rules.`;
  return `${count} ${after}`;
}
