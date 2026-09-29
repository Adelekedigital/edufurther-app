/**
 * PHASE A MOCK: the mock viewer's own reviews, written through POST /reviews
 * and edited through PATCH /reviews/{id}. Kept on globalThis so every mock
 * route in the server process sees the same store. ENABLE_MOCK_API=1 only.
 *
 * Shapes are the agreed review bundle (overall_rating, editable_until, the
 * poor | okay | great scale), ahead of the spec.
 */
import { MOCK_SESSION_TYPES } from './availability';
import { mockProfileIndex } from './fixtures';

export const MOCK_EDIT_WINDOW_MS = 10 * 60 * 1000;

export type MockReview = {
  id: string;
  session_id: string;
  reviewed_for: string;
  created_at: string;
  editable_until: string;
  overall_rating: number;
  public_review: string;
  communication_rating: string;
  knowledge_rating: string;
  support_rating: string;
  practicality_rating: string;
  valuable_rating: number;
  nps_recommend_score: number;
  private_review: string | null;
};

type Store = { reviews: Map<string, MockReview> };
const g = globalThis as unknown as { __efMockReviewStore?: Store };
export const store: Store = (g.__efMockReviewStore ??= { reviews: new Map() });

export function mineFor(mentorId: string): MockReview | null {
  for (const r of store.reviews.values()) if (r.reviewed_for === mentorId) return r;
  return null;
}

/**
 * Sessions the mock viewer can review with a mentor: those whose relationship
 * says a review is due (index % 3 === 1). Every sixth has two, so the
 * "Which session?" choice has data. A reviewed session drops out.
 */
export function mockReviewable(mentorId: string) {
  const { i } = mockProfileIndex(mentorId);
  if (i < 0 || i % 3 !== 1) return [];
  const DAY = 86_400_000;
  const base = Date.parse('2026-09-19T15:00:00Z');
  const count = i % 6 === 1 ? 2 : 1;
  return Array.from({ length: count }, (_, k) => {
    const t = MOCK_SESSION_TYPES[k % MOCK_SESSION_TYPES.length]!;
    return {
      session_id: `${mentorId}-s${k}`,
      mentor_id: mentorId,
      starts_at: new Date(base - k * 9 * DAY).toISOString(),
      session_type_id: t.id,
      session_type_name: t.name,
    };
  }).filter((s) => ![...store.reviews.values()].some((r) => r.session_id === s.session_id));
}

function editableUntil(r: MockReview): string | null {
  return Date.parse(r.editable_until) > Date.now() ? r.editable_until : null;
}

/** ReviewRead (POST/PATCH responses): every rating, `editable_until` (null once shut). */
export function reviewRead(r: MockReview) {
  return {
    id: r.id,
    session_id: r.session_id,
    reviewed_for: r.reviewed_for,
    created_at: r.created_at,
    updated_at: r.created_at,
    editable_until: editableUntil(r),
    overall_rating: r.overall_rating,
    public_review: r.public_review,
    communication_rating: r.communication_rating,
    knowledge_rating: r.knowledge_rating,
    support_rating: r.support_rating,
    practicality_rating: r.practicality_rating,
    valuable_rating: r.valuable_rating,
    nps_recommend_score: r.nps_recommend_score,
  };
}

/** AuthoredReviewRead (GET /reviews/{id}, the author only): ReviewRead + private_review. */
export function authoredRead(r: MockReview) {
  return { ...reviewRead(r), private_review: r.private_review };
}

/** GET /me/authored-reviews rows. */
export function authoredRow(r: MockReview) {
  return {
    id: r.id,
    created_at: r.created_at,
    editable_until: editableUntil(r),
    session_id: r.session_id,
    reviewed_for: r.reviewed_for,
    overall_rating: r.overall_rating,
    public_review: r.public_review,
  };
}
