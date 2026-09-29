import { toSimilarMentor } from './similar';

describe('toSimilarMentor', () => {
  it('maps the row: degree and school, the shared offering, Explore’s rules', () => {
    const s = toSimilarMentor({
      id: 'm2',
      slug: 'ademola-daniels',
      first_name: 'Ademola',
      last_name: 'Daniels',
      degree: 'PhD',
      study_course: 'Sociology',
      institution: 'University of Toronto',
      taking_bookings: true,
      completed_sessions: 1,
      review_count: 0,
      session_value: null,
      next_available_state: 'open',
      next_available_at: '2026-10-03T09:00:00Z',
      joined_at: '2026-09-01T12:00:00Z',
      shared_offering: { slug: 'visa-and-interview', display_name: 'Visa and interview' },
    });
    expect(s.meta).toBe('PhD, University of Toronto');
    expect(s.sharedTopic).toBe('Visa and interview');
    expect(s.mentor).toMatchObject({
      label: 'new',
      rating: null,
      profileHref: '/mentors/ademola-daniels',
    });
  });
});
