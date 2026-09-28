/**
 * PHASE A MOCK DATA: reviews and the viewer's relationship with a mentor,
 * derived from the mentor's index so the list, profile and tests agree.
 */
import type { components } from '@/lib/api/generated/schema';
import { MOCK_SESSION_TYPES } from './availability';
import { FEATURED, MENTORS, mockProfileIndex } from './fixtures';

type MentorReviewRead = components['schemas']['MentorReviewRead'];
type ReviewSummaryRead = components['schemas']['ReviewSummaryRead'];
type MentorRelationshipRead = components['schemas']['MentorRelationshipRead'];

const AUTHORS: [string, string, string][] = [
  ['Aladi', 'P', 'Kaduna State University'],
  ['Christiana', 'C', 'University of Nigeria, Nsukka'],
  ['Muhammed', 'O', 'Federal University Oye-Ekiti'],
  ['Somachi', 'S', 'University of Nigeria, Nsukka'],
  ['Folake', 'A', 'University of Lagos'],
  ['Taofeeq', 'A', 'Obafemi Awolowo University'],
  ['Pulane', 'L', 'University of Cape Town'],
];

const TEXTS = [
  'We worked on a strong statement of purpose for my graduate application. They know exactly what admissions committees look for and pushed me to be specific.',
  'Insightful session and a very honest conversation about which programs actually fund international students. I’d recommend them 100%.',
  'Ran a mock visa interview with me and gave clear notes on what to tighten. Ready for the real one now.',
  'Glad I found this platform and my mentor. They showed me how to approach professors about assistantships.',
  'They related to my situation coming from a less common course of study and explained how to frame it as a strength.',
  'Helped me cut a list of 14 programs to 6 that actually fit my research and fund internationals.',
  'Practical, direct feedback on my draft. Would have loved a bit more time, but it was worth it.',
];

const DAY = 86_400_000;
const NEWEST = Date.parse('2026-09-20T12:00:00Z');

/** Every review of a mentor, newest first. Every fifth author has deleted their account. */
export function mockReviews(mentorId: string): MentorReviewRead[] {
  const m = [FEATURED, ...MENTORS].find((x) => x.id === mentorId);
  if (!m) return [];
  const { i } = mockProfileIndex(mentorId);
  return Array.from({ length: m.review_count }, (_, k) => {
    const [first, last, school] = AUTHORS[(i + k) % AUTHORS.length]!;
    const deleted = k % 5 === 3;
    const type = MOCK_SESSION_TYPES[(i + k) % MOCK_SESSION_TYPES.length]!;
    return {
      id: `${mentorId}-r${k}`,
      created_at: new Date(NEWEST - (k * 23 + (i % 7)) * DAY).toISOString(),
      public_review: TEXTS[(i + k) % TEXTS.length]!,
      session_value: k % 4 === 2 ? 4 : 5,
      author_first_name: deleted ? null : first,
      author_last_initial: deleted ? null : last,
      author_institution: deleted ? null : school,
      author_deleted: deleted,
      session_type: { id: type.id, name: type.name },
    };
  });
}

/** The profile's summary. Every fourth reviewed mentor has no n-in-10 yet (the box hides). */
export function mockReviewSummary(mentorId: string): ReviewSummaryRead {
  const m = [FEATURED, ...MENTORS].find((x) => x.id === mentorId)!;
  const { i } = mockProfileIndex(mentorId);
  const n = m.review_count;
  const rate = (base: number) => ({ average: 2 + (base % 10) / 10, percent: base });
  return {
    count: n,
    session_value: m.session_value,
    recommended_percent: n ? 90 : null,
    would_recommend_in_10: n && i % 4 !== 3 ? 8 + (i % 3) : null,
    ...(n
      ? {
          communication_rating: rate(80 + (i % 9)),
          knowledge_rating: rate(90 + (i % 7)),
          support_rating: rate(85 + ((i * 3) % 10)),
          practicality_rating: rate(78 + ((i * 5) % 15)),
        }
      : {}),
  };
}

/**
 * The mock viewer's relationship: by mentor index, no session together (0),
 * a review due (1), or reviewed already (2).
 */
export function mockRelationship(mentorId: string): MentorRelationshipRead {
  const { i } = mockProfileIndex(mentorId);
  const k = Math.max(0, i) % 3;
  return {
    completed_sessions_with_mentor: k === 0 ? 0 : 2,
    last_reviewed_at: k === 2 ? '2026-07-10T12:00:00Z' : null,
    review_due: k === 1,
  };
}
