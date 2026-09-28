import { toReviewSummary } from './profile';
import { toReview, toReviewPrompt } from './reviews';

type Read = Parameters<typeof toReview>[0];
const read = (over: Partial<Read> = {}): Read => ({
  id: 'r1',
  created_at: '2025-09-08T12:00:00Z',
  public_review: 'We worked on a strong statement of purpose.',
  session_value: 5,
  author_first_name: 'Aladi',
  author_last_initial: 'p',
  author_institution: 'Kaduna State University',
  author_deleted: false,
  session_type: { id: 'st1', name: 'SOP draft review' },
  ...over,
});

describe('toReview', () => {
  it('maps the author as "First L." with initials, the topic and the text', () => {
    expect(toReview(read())).toEqual({
      id: 'r1',
      author: 'Aladi P.',
      initials: 'AP',
      institution: 'Kaduna State University',
      createdAt: '2025-09-08T12:00:00Z',
      rating: 5,
      topic: 'SOP draft review',
      text: 'We worked on a strong statement of purpose.',
    });
  });

  it('shows a deleted author as "Deleted user", with no school or initials', () => {
    const r = toReview(read({ author_deleted: true, author_first_name: null }));
    expect(r).toMatchObject({ author: 'Deleted user', initials: '', institution: null });
  });

  it('drops the text for a guest, so it never reaches the page', () => {
    expect(toReview(read(), true).text).toBe('');
  });

  it('keeps the rating within 1–5 and tolerates a missing topic', () => {
    expect(toReview(read({ session_value: 9, session_type: null }))).toMatchObject({
      rating: 5,
      topic: null,
    });
    expect(toReview(read({ session_value: 0 })).rating).toBe(1);
  });
});

describe('toReviewPrompt', () => {
  it('asks for a review when one is due', () => {
    expect(
      toReviewPrompt({
        completed_sessions_with_mentor: 2,
        review_due: true,
        last_reviewed_at: null,
      }),
    ).toBe('due');
  });
  it('says when they can review before a first session', () => {
    expect(toReviewPrompt({ completed_sessions_with_mentor: 0, review_due: false })).toBe('none');
  });
  it('says nothing once they have reviewed', () => {
    expect(
      toReviewPrompt({
        completed_sessions_with_mentor: 3,
        review_due: false,
        last_reviewed_at: '2026-07-01T00:00:00Z',
      }),
    ).toBeNull();
  });
});

describe('toReviewSummary', () => {
  it('maps n in 10 and whole-number attribute percentages', () => {
    expect(
      toReviewSummary({
        count: 7,
        session_value: 4.9,
        would_recommend_in_10: 9,
        communication_rating: { average: 2.6, percent: 86.4 },
        knowledge_rating: { average: 2.9, percent: 96 },
        support_rating: { average: 2.7, percent: null },
      }),
    ).toEqual({
      count: 7,
      rating: 4.9,
      wouldRecommendIn10: 9,
      attributes: { communication: 86, knowledge: 96, support: null, practicality: null },
    });
  });

  it('is empty, not broken, with no summary at all', () => {
    expect(toReviewSummary(undefined)).toMatchObject({
      count: 0,
      rating: null,
      wouldRecommendIn10: null,
    });
  });

  it('keeps n in 10 within 0–10', () => {
    expect(toReviewSummary({ count: 1, would_recommend_in_10: 12 }).wouldRecommendIn10).toBe(10);
  });
});
