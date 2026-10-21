/**
 * Calendar v2.dc.html (copy research, PRD Calendar 21 Oct). Copy reviewed with
 * edufurther-ux-writer, 2026-10-21.
 */
export const BOOKING_RULES_COPY = {
  title: 'Booking rules',
  sub: 'Your default rules for every session. You can customize them for a single session.',
  editLabel: 'Edit booking rules',
  saved: 'Your booking rules are saved.',
  tooShort: 'Your weekly hours are too short for this session length.',
  settingsLead: 'You can manage all your booking rules in',
  settingsLink: 'Settings › Booking rules',
  settingsHref: '/settings/booking',
} as const;

/** Weekly availability (Calendar v2 `hoursTitle`, `hoursSummary`, `hoursChip`). */
export const HOURS_COPY = {
  title: 'Weekly availability',
  noHours: 'Add the days and times mentees can book you',
  tapToView: 'Tap to view',
  chipInvalid: 'Fix hours',
  chipUnsaved: 'Unsaved',
  chipNotSet: 'Not set',
} as const;
