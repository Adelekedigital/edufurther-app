/** Every query key, in one module (data-layer skill). */
export type MentorFilters = { q: string; offerings: string[] };

export const keys = {
  topics: {
    all: ['topics'] as const,
  },
  mentors: {
    all: ['mentors'] as const,
    featured: ['mentors', 'featured'] as const,
    // Offerings are sorted so ['a','b'] and ['b','a'] share one cache entry.
    list: (f: MentorFilters) =>
      ['mentors', 'list', { q: f.q, offerings: [...f.offerings].sort() }] as const,
  },
  booking: {
    options: (mentorId: string) => ['booking', 'options', mentorId] as const,
  },
};
