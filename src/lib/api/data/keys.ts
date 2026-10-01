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
    /** Whole days the mentor blocked (availability exceptions). */
    blocked: (userId: string) => ['calendar', 'blocked', userId] as const,
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
};
