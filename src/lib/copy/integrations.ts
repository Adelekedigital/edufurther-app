/**
 * Every word /integrations shows (Integrations.dc.html `copy=research`,
 * videoLayout=primary, plus PRD: Integrations "Update 21 Oct").
 *
 * The PRD overrides the design in two places, both listed in its own
 * "For the designer" section:
 *  - Google Meet's note. The design says attendance "won't count toward your
 *    session analytics". That is false: a Meet session counts at its booked
 *    length. What we cannot do is measure it, so the copy says that instead.
 *  - The disconnect confirm, which stays exactly as built (handoff A1/A2).
 */

export const INTEGRATIONS_COPY = {
  title: 'Integrations',
  sub: 'Choose your video for sessions and connect your calendar to avoid double-bookings.',
} as const;

/**
 * What EduFurther does with the choice, on its own so Calendar's booking modal
 * can say it without repeating it. The subtitle below is built from it and is
 * byte-identical to what it was.
 */
export const VIDEO_LINK_LINE =
  'We create a private link for each booking and add it to your invite and your mentee’s.';

/** "Video for sessions" (design `secPlain`). */
export const VIDEO_COPY = {
  title: 'Video for sessions',
  sub: `Pick where your sessions happen. ${VIDEO_LINK_LINE}`,
  groupLabel: 'Video provider',
  /** Above the alternatives, under the recommended card (design `vlPrimary`). */
  otherOption: 'Other option',
  /** A personal link makes two, so the label has to count. */
  otherOptions: 'Other options',
  /** "Where your sessions run" is the banned shape for this concept (ux-writer §6). */
  loadError: 'We couldn’t load your video for sessions.',
  retry: 'Try again',
  /**
   * Said out loud when a save fails and the mutation gave us no message of its
   * own. Exported because Calendar's booking modal saves the same setting and
   * must fail in the same words.
   */
  saveFailed: 'We couldn’t save your video setting. Try again.',
} as const;

/**
 * The one trade-off a mentor is choosing between, so the card and the switch
 * confirm say it with the same words. A paraphrase in one of the two places
 * reads as a second meaning (ux-writer, 2026-10-21).
 */
export const MEET_COUNTS_AT_BOOKED =
  'We can’t measure how long a Google Meet session runs, so it counts at its booked length.';

/** The recommended card (design `vMain`). */
export const DAILY_COPY = {
  label: 'EduFurther video',
  by: 'Built in · powered by Daily',
  desc: 'A private room for each session. Mentees join from the browser with no account or download.',
  /**
   * The one claim about minutes we can make: EduFurther video counts the longer
   * of measured and booked (PRD decision 4), so a session that runs over is
   * never counted short.
   */
  benefit: 'Attendance is tracked, so every session counts toward your session analytics.',
} as const;

/**
 * The alternative (design `vOthers`).
 *
 * `by` and `desc` are NOT rendered on /integrations and that is deliberate:
 * the drawn `primary` row carries one line under its label, and the note is
 * the line a mentor is choosing on. They are here, not deleted, because the
 * same provider may be drawn as a full card elsewhere, and that layout has a
 * slot for both (Calendar's picker reuses VideoSection as is). `by` in particular
 * replaces the old "Uses your Google account", which was false.
 */
export const MEET_COPY = {
  label: 'Google Meet',
  /** Links are minted on EduFurther's calendar, not the mentor's (backend reply #2). */
  by: 'Hosted by EduFurther · no Google account needed',
  desc: 'A new Meet link for each booking, added to your calendar invite and your mentee’s.',
  /** Replaces the design's attendance line, which claimed Meet does not count. */
  note: MEET_COUNTS_AT_BOOKED,
} as const;

/**
 * PROVISIONAL — the design draws no card for a personal link, because the page
 * no longer offers one (PRD decision 1). Support can still set `custom` on the
 * API, so a mentor already on one has to see what their sessions are using,
 * read-only. Switching away is one-way: there is no route back from this page.
 */
export const CUSTOM_COPY = {
  label: 'Personal meeting link',
  note: 'Every mentee gets the same link, so anyone with an old invite can join.',
} as const;

/** Replaces the confirm label while the PATCH is out. */
export const SWITCHING = 'Switching…';

/** Mirrors ConferencingProvider; copy never imports the generated client. */
export type VideoChoice = 'daily' | 'google_meet' | 'custom';

/** What each provider is called, wherever it is named. */
export const VIDEO_LABELS: Record<VideoChoice, string> = {
  daily: DAILY_COPY.label,
  google_meet: MEET_COPY.label,
  custom: CUSTOM_COPY.label,
};

/**
 * What a provider is called when a sentence is about leaving it, and what else
 * the mentor needs to know before they go.
 *
 * `oneWay` is only on `custom`, and it is the one sentence on this screen a
 * mentor cannot undo by pressing the other card. The backend keeps the URL on
 * its own row (a CHECK constraint won't let it be null), but `GET
 * /me/conferencing` returns only the default row and a PATCH back to `custom`
 * is a 422 without a URL in the body. So it is not deleted, and it is also not
 * reachable from here: support is the route back (backend reply, 2026-10-21).
 */
const LEAVING: Record<VideoChoice, { booked: string; keep: string; oneWay?: string }> = {
  daily: { booked: 'their EduFurther video link', keep: 'Keep EduFurther video' },
  google_meet: { booked: 'their Google Meet link', keep: 'Keep Google Meet' },
  // PROVISIONAL, like the card itself: the PRD specifies only the two
  // directions between EduFurther video and Meet, because those are the only
  // two the page can reach. Support can still put an account on a personal
  // link, and "keep their Google Meet link" would be a lie to that mentor.
  custom: {
    booked: 'your personal meeting link',
    keep: 'Keep personal meeting link',
    oneWay: 'You won’t be able to choose it again here, so ask support if you need it back.',
  },
};

/**
 * The switch confirm (design `switchOpen`). Nothing saves until it is
 * answered, so this is the last thing a mentor reads before their sessions
 * change venue: what new bookings do, what booked ones keep, then the
 * trade-off (ux-writer §7).
 */
export function switchCopy(from: VideoChoice, to: 'daily' | 'google_meet') {
  const leaving = LEAVING[from];
  /**
   * "confirmed", not the PRD's "booked". A meeting link is written when a
   * session is confirmed, not when it is requested, so a mentor who approves
   * bookings by hand has pending requests that will take the NEW provider the
   * moment they accept them (backend reply, 2026-10-21). "Sessions already
   * booked keep their X link" promises those mentors something untrue; one
   * word makes it true for both booking modes without a second sentence.
   */
  const kept = `Sessions already confirmed keep ${leaving.booked}.`;
  const after = leaving.oneWay ? `${kept} ${leaving.oneWay}` : kept;
  return to === 'google_meet'
    ? {
        title: 'Switch to Google Meet?',
        body: `New bookings will use Google Meet. ${after} ${MEET_COUNTS_AT_BOOKED}`,
        confirm: 'Switch to Google Meet',
        keep: leaving.keep,
      }
    : {
        title: 'Switch to EduFurther video?',
        body: `New bookings will use EduFurther video, and their attendance counts toward your session analytics. ${after}`,
        confirm: 'Switch to EduFurther video',
        keep: leaving.keep,
      };
}

/** The groups below the video section (design `groups`). */
export const CALENDARS_COPY = {
  title: 'Calendars',
  desc: 'Avoid double-bookings.',
} as const;

export const PAYMENTS_COPY = {
  title: 'Payments',
  desc: 'For paid sessions, once they’re available.',
  label: 'Get paid for sessions',
  cardDesc: 'Charge for your sessions and get paid in your local currency.',
} as const;

/**
 * A Google Calendar connection that has broken, wherever a mentor meets it
 * (PRD: Integrations, 21 Oct, decision 5). Lives here rather than in
 * `calendar.ts` because this is the calendar-connection vocabulary, next to
 * CALENDARS_COPY, and the banner shows on Calendar and Mentor Home as well as
 * here.
 */
export const RECONNECT_COPY = {
  /**
   * One line, as drawn: what is wrong, then what it is costing. A mentor whose
   * grant lapsed is quietly losing the one thing they connected it for, and
   * that cost is the reason to press the button.
   */
  line: 'Google Calendar needs reconnecting. Until then, times you’re busy can still be booked.',
  action: 'Reconnect',
  /** Integrations says "connected"; this one is about repair. */
  reconnected: 'Google Calendar reconnected. Your busy times are hidden from your booking page.',
  busy: 'Waiting for Google… finish in the window that opened, or close it to stop.',
} as const;

export const RECONNECT_FAILURES = {
  blocked: 'Your browser blocked the pop-up. Allow pop-ups for EduFurther, then try again.',
  /**
   * Google puts calendar access behind its own checkbox a step after choosing
   * an account, so clicking straight through grants sign-in only and the
   * backend refuses it. We cannot tell that from a closed window, so this
   * covers both, and it is not phrased as an error: nothing broke.
   */
  nothingConnected:
    'Nothing was reconnected. The window closed, or the calendar permission wasn’t ticked. Google asks for that on a separate step.',
  // Not the house's "try again when you reconnect": on this screen "reconnect"
  // means the calendar, so using it for the internet is genuinely ambiguous.
  offline: 'You’re offline. Try reconnecting when you’re back online.',
  failed: 'We couldn’t start reconnecting. Try again in a moment.',
  /**
   * No Google client on this deployment, so the button can never work. We do
   * not say we are looking into it: nobody has promised that, and a banner is
   * not the place to invent reassurance (ux-writer §3.5).
   */
  unavailable: 'Reconnecting isn’t available right now. Try again later.',
} as const;

export type ReconnectFailure = keyof typeof RECONNECT_FAILURES;
