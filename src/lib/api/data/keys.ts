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
    fieldsOfStudy: ['catalog', 'fields-of-study'] as const,
  },
  /** The owner's own education entries (GET /users/{id}/education), for editing. */
  education: (userId: string) => ['education', userId] as const,
  /** Mentee onboarding (Mentee Onboarding v5): progress + saved answers, and the matches. */
  onboarding: {
    all: ['onboarding'] as const,
    state: (userId: string) => ['onboarding', 'state', userId] as const,
    matchesAll: ['onboarding', 'matches'] as const,
    matches: (userId: string, forMentor: string, limit: number, excludeMet: boolean) =>
      ['onboarding', 'matches', userId, forMentor, limit, excludeMet] as const,
  },
  viewer: {
    all: ['viewer'] as const,
    me: (userId: string) => ['viewer', 'me', userId] as const,
    /** The raw /me mentor application (mentorApplicationStatus.ts), under the viewer prefix. */
    mentorApplication: (userId: string) => ['viewer', 'mentorApplication', userId] as const,
    mentorApplicationAll: ['viewer', 'mentorApplication'] as const,
    /** Settings' read of /me (settings.ts), under the viewer prefix so a viewer refresh reaches it. */
    settings: (userId: string) => ['viewer', 'settings', userId] as const,
    /** How the session logged in (Supabase identities), for Login and security. */
    loginProvider: (userId: string) => ['viewer', 'loginProvider', userId] as const,
    /** Settings › Goals' read of /me (goals.ts): the goal, origin and current country. */
    goals: (userId: string) => ['viewer', 'goals', userId] as const,
    /** Mentor Settings' read of /me (mentorSettings.ts): the handle and gender. */
    mentorSettings: (userId: string) => ['viewer', 'mentorSettings', userId] as const,
    /** Settings › Expertise's guide-to countries (mentorSettings.ts), from the owner's mentor profile. */
    guideCountries: (userId: string) => ['viewer', 'guideCountries', userId] as const,
    /** Settings › Social links: LinkedIn and the user's links, from /me. */
    links: (userId: string) => ['viewer', 'links', userId] as const,
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
    // `offering`: the topic chip's slug (null = all). `who`: guests fetch one.
    reviews: (handle: string, offering: string | null, who: string) =>
      ['mentors', 'reviews', handle, offering, who] as const,
    relationship: (mentorId: string, who: string) =>
      ['mentors', 'relationship', mentorId, who] as const,
    similar: (handle: string, who: string) => ['mentors', 'similar', handle, who] as const,
    freeSoon: (days: number, who: string) => ['mentors', 'freeSoon', days, who] as const,
    /** Prefixes, for invalidating every variant after a review is sent. */
    reviewsAll: ['mentors', 'reviews'] as const,
    profilesAll: ['mentors', 'profile'] as const,
    /** Every Explore list: signed-in lists are ordered by the viewer's goals. */
    listAll: ['mentors', 'list'] as const,
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
    upcoming: (who: string, from: string, as?: 'mentor' | 'mentee') =>
      ['bookings', 'upcoming', who, from, as ?? 'all'] as const,
    pending: (who: string) => ['bookings', 'pending', who] as const,
    // Statuses are sorted so two orders of the same filter share one entry.
    history: (who: string, statuses: readonly string[]) =>
      ['bookings', 'history', who, [...statuses].sort()] as const,
    /** One booking, for a ?booking= link opened cold (GET /sessions/{id}). */
    one: (id: string, who: string) => ['bookings', 'one', id, who] as const,
    /** One session as the join page reads it: both parties and the venue (GET /sessions/{id}). */
    room: (id: string, who: string) => ['bookings', 'room', id, who] as const,
    /** One session's room for whoever is signed in, for a write that knows only the id. */
    roomAll: (id: string) => ['bookings', 'room', id] as const,
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
  /** The owner's mentor performance stats (GET /me/mentor-stats[/monthly]). */
  mentorStats: {
    monthly: (userId: string, months: number) =>
      ['mentorStats', 'monthly', userId, months] as const,
    window: (userId: string, windowDays: number) =>
      ['mentorStats', 'window', userId, windowDays] as const,
    year: (userId: string, year: number) => ['mentorStats', 'year', userId, year] as const,
  },
  /** Reviews written about the owner (GET /me/reviews). Scoped by user id, like every owner-only key. */
  myReviews: {
    /** The newest showable review, for the dashboard's session-quality quote. */
    quote: (userId: string) => ['myReviews', 'quote', userId] as const,
  },
  /**
   * The mentee home KPI stats (GET /api/v1/me/mentee-stats). `who` = the session
   * identity, as every per-account key here: one mentee's progress is never
   * another's, and a sign-out must not leave it cached.
   */
  menteeHome: {
    /** Prefix, for refreshing Home after onboarding completes (the starter credit). */
    all: ['menteeHome'] as const,
    stats: (who: string) => ['menteeHome', 'stats', who] as const,
  },
  /**
   * Mentors the mentee has met (GET /me/mentors), for the home "Book again"
   * list. `who` = the session identity, as every per-account key here.
   */
  metMentors: {
    /** Prefix, for invalidating the list after a booking flips a bookability. */
    all: ['metMentors'] as const,
    list: (who: string) => ['metMentors', 'list', who] as const,
  },
  /**
   * The viewer's personal invite link (POST /me/invite-link) and the invites
   * sent so far (GET /me/referrals), and the lookup of an invite a visitor
   * arrived with. `who` = the session identity. The link
   * is never refetched by itself: a future PUT (handle) or PATCH (revoke) must
   * set or invalidate `link`.
   */
  invite: {
    all: ['invite'] as const,
    link: (who: string) => ['invite', 'link', who] as const,
    referrals: (who: string) => ['invite', 'referrals', who] as const,
    /** Prefix: every session's referrals list (a claim invalidates them). */
    referralsAll: ['invite', 'referrals'] as const,
    /** Who an invite is from (GET /invites/{code}): public, the same for every viewer. */
    lookup: (code: string) => ['invite', 'lookup', code] as const,
  },
  /**
   * Mentor onboarding's read of /me (Mentor Onboarding PRD F1). Under `viewer`,
   * so whatever refreshes the viewer (a new photo) refreshes the answers too.
   * Its own key: the status page caches a different shape of the same /me
   * under `viewer.mentorApplication`.
   */
  mentorApplication: {
    all: ['viewer', 'mentorOnboarding'] as const,
    me: (userId: string) => ['viewer', 'mentorOnboarding', userId] as const,
    institutions: (q: string) => ['institutions', q] as const,
  },
  /**
   * The admin app (Admin PRD), keyed by the signed-in admin (`me`). Every
   * admin write invalidates `admin.all`, so
   * the summary (cards, tab counts, the nav badge) and every list stay true.
   */
  admin: {
    all: ['admin'] as const,
    summary: (me: string) => ['admin', me, 'mentors', 'summary'] as const,
    mentors: (me: string, tab: string) => ['admin', me, 'mentors', 'list', tab] as const,
    mentor: (me: string, id: string) => ['admin', me, 'mentors', 'detail', id] as const,
    notes: (me: string, id: string) => ['admin', me, 'mentors', 'notes', id] as const,
    mentees: (me: string, q: string) => ['admin', me, 'mentees', q] as const,
    menteeCredits: (me: string, id: string) => ['admin', me, 'mentee-credits', id] as const,
    creditLog: (me: string, type: string) => ['admin', me, 'credit-log', type] as const,
    creditRules: (me: string) => ['admin', me, 'credit-rules'] as const,
  },
};
