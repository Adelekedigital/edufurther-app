/**
 * Bookings copy (`/bookings`): Mentor Bookings.dc.html at its saved defaults,
 * with the PRD Mentor Bookings changes (Oct 25). Reviewed with
 * edufurther-ux-writer; no em dashes. The outcome tags live in `outcomeTag`
 * (lib/utils/bookings), because they are decided from the booking.
 */
export const BOOKINGS_COPY = {
  /** Above the Pending list, when every request is the viewer's to answer. */
  pendingIntroMentor:
    'These mentees asked for a time. Accept to confirm it, or decline so they can pick another.',
  /** Above the Pending list, when every request is one the viewer sent. */
  pendingIntroMentee: 'Requests you sent that your mentor hasn’t confirmed yet.',
  /** On a request that would clash with a confirmed session if accepted. */
  overlap: (time: string, first: string) => `Overlaps your ${time} session with ${first}`,
  /** The panel's answers toggle. */
  showAllAnswers: (n: number) => `Show all ${n} answers`,
  showLess: 'Show less',
  /** Under the mentor's empty Upcoming state; the link opens Calendar. */
  moreSessions: { lead: 'Want more sessions?', link: 'Update your availability' },
};
