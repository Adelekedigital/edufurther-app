/** Every query key, in one module (data-layer skill). */
export type MentorFilters = { q: string; offerings: string[] };

export const keys = {
  topics: {
    all: ['topics'] as const,
  },
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
    list: (f: MentorFilters, who: string) =>
      ['mentors', 'list', who, { q: f.q, offerings: [...f.offerings].sort() }] as const,
  },
  booking: {
    sessionTypes: (mentorId: string) => ['booking', 'sessionTypes', mentorId] as const,
    /** Prefix: every offering's slots for one mentor (invalidated after a booking). */
    slotsFor: (mentorId: string) => ['booking', 'slots', mentorId] as const,
    slots: (mentorId: string, sessionTypeId: string) =>
      ['booking', 'slots', mentorId, sessionTypeId] as const,
  },
};
