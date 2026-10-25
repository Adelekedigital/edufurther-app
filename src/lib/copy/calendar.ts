/**
 * Calendar v2.dc.html (copy research, PRD Calendar 21 Oct). Copy reviewed with
 * edufurther-ux-writer, 2026-10-21.
 */
import {
  CUSTOM_COPY,
  VIDEO_COPY,
  VIDEO_LABELS,
  VIDEO_LINK_LINE,
  type VideoChoice,
} from './integrations';
/** The page header (Calendar v2 `copy` research). */
export const CALENDAR_PAGE_COPY = {
  lede: 'Set your availability, manage days off and choose how you’ll meet with mentees.',
  /** The status pill's hint while available (busy hints: `busyHint`). */
  availableHint: 'Mentees can book you',
  blockTitle: 'Block dates',
} as const;

export const BOOKING_RULES_COPY = {
  title: 'Booking rules',
  sub: 'Your default rules for every session. You can customize them for a single session.',
  editLabel: 'Edit booking rules',
  saved: 'Your booking rules are saved.',
  tooShort:
    'Your weekly hours are too short for this session length. Add longer hours or pick a shorter length.',
  /** The whole line is the link (owner, 2026-10-21; ux-writer new-tab pattern). */
  settingsLink: 'Manage your booking rules in Settings',
  settingsHref: '/settings/booking',
} as const;

/** Weekly availability (Calendar v2 `hoursTitle`, `hoursSummary`, `hoursChip`). */
export const HOURS_COPY = {
  title: 'Weekly availability',
  noHours: 'Add the days and times mentees can book you',
  /** The notice above an empty week (Calendar v2 `noHours`, copy research). */
  noHoursNotice:
    'Your availability isn’t set yet. Add your weekly hours so mentees can find and book you.',
  tapToView: 'Tap to view',
  chipInvalid: 'Fix hours',
  chipUnsaved: 'Unsaved',
  chipNotSet: 'Not set',
  chipTotal: (hours: number) => `${hours} hrs a week`,
} as const;

/** The status a mentor can't change: an admin unlisted them (PRD Calendar, "Unlisted by EduFurther"). */
export const UNLISTED_COPY = {
  title: 'Unlisted by EduFurther',
  body: 'EduFurther has taken your profile off the listing, so mentees can’t find or book you, and you can’t switch to available or busy yourself.',
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

/** Calendar v2 video row and picker (copy research: "Video for sessions: …"). */
export const VIDEO_ROW_COPY = {
  modalTitle: VIDEO_COPY.title,
  modalSub: VIDEO_LINK_LINE,
  editLabel: 'Change video for sessions',
  summary: 'A private link is created for every booking. Nothing to paste.',
  customSummary: CUSTOM_COPY.note,
  saved: 'Your video setting is saved.',
  saveFailed: VIDEO_COPY.saveFailed,
} as const;

/** "Video for sessions: Google Meet", in Integrations' names for each provider. */
export const videoRowTitle = (provider: VideoChoice) =>
  `${VIDEO_COPY.title}: ${VIDEO_LABELS[provider]}`;
