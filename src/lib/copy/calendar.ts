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

/** The status a mentor can't change: an admin unlisted them (PRD Calendar, "Unlisted by EduFurther"). */
export const UNLISTED_COPY = {
  title: 'Unlisted by EduFurther',
  body: 'EduFurther has taken your profile off the listing for now, so mentees can’t find or book you, and you can’t switch to available or busy yourself.',
  contact: 'Contact support',
  after: 'if you have questions.',
  /** The prefilled mail; support sees the sender's address, so the name signs it. */
  subject: (firstName: string) =>
    firstName ? `My profile was unlisted (${firstName})` : 'My profile was unlisted',
  mailBody: (firstName: string) =>
    [
      'Hi EduFurther team,',
      '',
      'My mentor profile was taken off the listing. Could you tell me why, and what I can do?',
      '',
      'Thanks,',
      firstName,
      // CRLF: line breaks in a mailto body (RFC 6068).
    ].join('\r\n'),
} as const;

/** Going busy or back while offline (PRD Calendar, Busy and back errors). */
export const statusOffline = (pausing: boolean) =>
  `You’re offline, so we couldn’t set you as ${pausing ? 'busy' : 'available'}. Try again when you reconnect.`;
