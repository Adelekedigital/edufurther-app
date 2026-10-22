/**
 * PHASE A MOCK: every review the reviews route lists for a mentor, newest
 * first: the viewer's own (written through the mock) leads. The profile's
 * `review_topics` count these same rows, so a topic's count is what its
 * `?offering=` filter pages through. Its own module: the review store imports
 * `./reviews`, so `./reviews` can't import the store.
 */
import type { components } from '@/lib/api/generated/schema';
import { MOCK_SESSION_TYPES } from './availability';
import { mineFor } from './reviewStore';
import { mockReviewOfferings, mockReviews } from './reviews';

type MentorReviewRead = components['schemas']['MentorReviewRead'];

export function mockMentorReviewList(mentorId: string): MentorReviewRead[] {
  const own = mineFor(mentorId);
  if (!own) return mockReviews(mentorId);
  const type =
    MOCK_SESSION_TYPES[Number(own.session_id.split('-s').pop()) % MOCK_SESSION_TYPES.length] ??
    null;
  const mine: MentorReviewRead = {
    id: own.id,
    created_at: own.created_at,
    public_review: own.public_review,
    session_value: own.overall_rating,
    overall_rating: own.overall_rating,
    author_first_name: 'Esther',
    author_last_initial: 'M',
    author_institution: 'University of Lagos',
    author_deleted: false,
    session_type: type ? { id: type.id, name: type.name } : null,
    service_offerings: mockReviewOfferings(mentorId, 0),
  };
  return [mine, ...mockReviews(mentorId)];
}
