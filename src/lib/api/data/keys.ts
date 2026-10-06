/** Every query key, in one module (data-layer skill). */
export type MentorFilters = { q: string; offerings: string[] };

export const keys = {
  topics: {
    all: ['topics'] as const,
  },
  /** Reference lists the owner's profile forms are built from (GET /catalog/{catalogue}). */
  catalog: {
    countries: ['catalog', 'countries'] as const,
    /** '' = the common set. */
    languages: (q: string) => ['catalog', 'languages', q] as const,
    degreeLevels: ['catalog', 'degree-levels'] as const,
  },
  /** The owner's own education entries (GET /users/{id}/education), for editing. */
  education: (userId: string) => ['education', userId] as const,
  viewer: {
    all: ['viewer'] as const,
    me: (userId: string) => ['viewer', 'me', userId] as const,
  },
  // `who` = the session identity (session.ts sessionKey): signed-in lists are
  // ordered by the viewer's goals and leave the viewer out, so they can't share
  // a cache entry with the guest list.
  mentors: {
    all: ['mentors'] as const,
    featured: (who: string) => ['mentors', 'featured', who] as const,
    // Offerings are sorted so ['a','b'] and ['b','a'] share one cache entry.
    // `who`: the owner gets their own page in any state, with owner-only fields.
    profile: (handle: string, who: string) => ['mentors', 'profile', handle, who] as const,
    list: (f: MentorFilters, who: string) =>
      ['mentors', 'list', who, { q: f.q, offerings: [...f.offerings].sort() }] as const,
    // `sessionTypeId`: the filter chip ('all' = none). `who`: guests fetch one.
    reviews: (handle: string, sessionTypeId: string, who: string) =>
      ['mentors', 'reviews', handle, sessionTypeId, who] as const,
    relationship: (mentorId: string, who: string) =>
      ['mentors', 'relationship', mentorId, who] as const,
    similar: (handle: string, who: string) => ['mentors', 'similar', handle, who] as const,
    /** Prefixes, for invalidating every variant after a review is sent. */
    reviewsAll: ['mentors', 'reviews'] as const,
    profilesAll: ['mentors', 'profile'] as const,
    relationshipFor: (mentorId: string) => ['mentors', 'relationship', mentorId] as const,
    reviewableFor: (mentorId: string) => ['mentors', 'reviewable', mentorId] as const,
    myReviewFor: (mentorId: string) => ['mentors', 'myReview', mentorId] as const,
    /** The viewer's sessions with this mentor that can be reviewed, and their own review. */
    reviewable: (mentorId: string, who: string) =>
      ['mentors', 'reviewable', mentorId, who] as const,
    myReview: (mentorId: string, who: string) => ['mentors', 'myReview', mentorId, who] as const,
  },
  // `who`: the session identity — one mentor's own list is never another's.
  sessionTypes: {
    all: ['sessionTypes'] as const,
    own: (who: string) => ['sessionTypes', 'own', who] as const,
    /** One type with its questions and hours, for the edit form. */
    edit: (id: string) => ['sessionTypes', 'edit', id] as const,
  },
  // A mentor's booking preferences and Calendar hours, by their user id.
  mentorDefaults: (userId: string) => ['mentorDefaults', userId] as const,
  weeklyHours: (userId: string) => ['weeklyHours', userId] as const,
  /** Calendar: one parent, so a change can refresh booked and blocked days together. */
  calendar: {
    all: ['calendar'] as const,
    /** The mentor's upcoming booked sessions (the month's dots). */
    booked: (userId: string) => ['calendar', 'booked', userId] as const,
    /** One range of booked days; `booked(userId)` refreshes every range. */
    bookedRange: (userId: string, from: string, to: string) =>
      ['calendar', 'booked', userId, from, to] as const,
    /** Whole days the mentor blocked (availability exceptions). */
    blocked: (userId: string) => ['calendar', 'blocked', userId] as const,
    /** Listed, busy (paused by the mentor) and the return date. */
    status: (userId: string) => ['calendar', 'status', userId] as const,
    /** Where sessions run (GET /me/conferencing). */
    video: (userId: string) => ['calendar', 'video', userId] as const,
    /** Whether Google Calendar is connected (GET /me/calendar). */
    connection: (userId: string) => ['calendar', 'connection', userId] as const,
  },
  /**
   * "Tell me when this ships". One small list per account answers for every
   * coming-soon button on the page — but it is **scoped by account**, like
   * every other key here that holds somebody's own data. The cache does not
   * actually survive a user switch (every sign-out is a full document load),
   * so this is not load-bearing; it is here so nobody has to re-derive that
   * to know the key is safe.
   */
  interest: {
    forUser: (userId: string) => ['interest', userId] as const,
  },
  /** A review as its author reads it (GET /reviews/{id}), to pre-fill Edit. */
  reviews: {
    authoredAll: ['reviews', 'authored'] as const,
    authored: (reviewId: string, who: string) => ['reviews', 'authored', reviewId, who] as const,
  },
  booking: {
    sessionTypes: (mentorId: string) => ['booking', 'sessionTypes', mentorId] as const,
    /** Prefix: every offering's slots for one mentor (invalidated after a booking). */
    slotsFor: (mentorId: string) => ['booking', 'slots', mentorId] as const,
    slots: (mentorId: string, sessionTypeId: string) =>
      ['booking', 'slots', mentorId, sessionTypeId] as const,
  },
  /**
   * The Bookings screen (GET /users/{id}/sessions). `who` = the session
   * identity: one account's sessions are never another's, and signing out must
   * not leave them in the cache.
   */
  bookings: {
    all: ['bookings'] as const,
    // `from` (today in the account's zone) is an input to the result, so it is
    // in the key: without it the page would survive midnight unchanged.
    upcoming: (who: string, from: string) => ['bookings', 'upcoming', who, from] as const,
    pending: (who: string) => ['bookings', 'pending', who] as const,
    // Statuses are sorted so two orders of the same filter share one entry.
    history: (who: string, statuses: readonly string[]) =>
      ['bookings', 'history', who, [...statuses].sort()] as const,
    /** One booking, for a ?booking= link opened cold (GET /sessions/{id}). */
    one: (id: string, who: string) => ['bookings', 'one', id, who] as const,
    /** Why a past booking ended as it did (GET /sessions/{id}/events). */
    events: (id: string, who: string) => ['bookings', 'events', id, who] as const,
    /** Every reviewable-sessions entry, for invalidating after a review. */
    reviewableAll: ['bookings', 'reviewable'] as const,
    /** What the mentee wrote when booking (GET /sessions/{id}/answers). */
    answers: (id: string, who: string) => ['bookings', 'answers', id, who] as const,
    /**
     * Every session the viewer may review (GET /me/reviewable-sessions), whole.
     * `keys.mentors.reviewable` is the same endpoint narrowed to one mentor for
     * a profile tab; this screen asks across all of them.
     */
    reviewable: (who: string) => ['bookings', 'reviewable', who] as const,
  },
  /** One intake file's bytes, held only while its viewer is open (gcTime 0). */
  intakeFile: (id: string, who: string) => ['intakeFile', id, who] as const,
};
