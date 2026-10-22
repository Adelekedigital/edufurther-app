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
  service_offerings: [
    { slug: 'document-preparation', display_name: 'Document preparation' },
    { slug: 'interview-preparation', display_name: 'Interview preparation' },
  ],
  ...over,
});

describe('toReview', () => {
  it('maps the author as "First L." with initials, the topics, the session type and the text', () => {
    expect(toReview(read())).toEqual({
      id: 'r1',
      author: 'Aladi P.',
      initials: 'AP',
      institution: 'Kaduna State University',
      createdAt: '2025-09-08T12:00:00Z',
      rating: 5,
      topics: [
        { slug: 'document-preparation', name: 'Document preparation' },
        { slug: 'interview-preparation', name: 'Interview preparation' },
      ],
      sessionType: 'SOP draft review',
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

  it('keeps the rating within 1–5 and tolerates no topics or session type (migrated)', () => {
    expect(
      toReview(read({ session_value: 9, session_type: null, service_offerings: undefined })),
    ).toMatchObject({ rating: 5, topics: [], sessionType: null });
    expect(toReview(read({ service_offerings: [] })).topics).toEqual([]);
    expect(toReview(read({ session_value: 0 })).rating).toBe(1);
  });
});

describe('toReviewPrompt', () => {
  it('asks for a review when one is due', () => {
    expect(
      toReviewPrompt({
        completed_sessions_with_mentor: 2,
        review_due: true,
        review_update_due: false,
        last_reviewed_at: null,
      }),
    ).toBe('due');
  });
  it('says when they can review before a first session', () => {
    expect(
      toReviewPrompt({
        completed_sessions_with_mentor: 0,
        review_due: false,
        review_update_due: false,
      }),
    ).toBe('none');
  });
  it('says nothing once they have reviewed', () => {
    expect(
      toReviewPrompt({
        completed_sessions_with_mentor: 3,
        review_due: false,
        review_update_due: false,
        last_reviewed_at: '2026-07-01T00:00:00Z',
      }),
    ).toBeNull();
  });
  it('an update due (P6) wins over plain "due", with when the last review was (#518)', () => {
    expect(
      toReviewPrompt({
        completed_sessions_with_mentor: 4,
        review_due: true,
        review_update_due: true,
        last_reviewed_at: '2026-07-10T12:00:00Z',
      }),
    ).toEqual({ kind: 'again', lastReviewedAt: '2026-07-10T12:00:00Z' });
  });
  it('an update flagged with no review date falls back to "due" (same flow, first-review words)', () => {
    expect(
      toReviewPrompt({
        completed_sessions_with_mentor: 4,
        review_due: true,
        review_update_due: true,
        last_reviewed_at: null,
      }),
    ).toBe('due');
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
      topics: [],
    });
  });

  it('is empty, not broken, with no summary at all', () => {
    expect(toReviewSummary(undefined)).toMatchObject({
      count: 0,
      rating: null,
      wouldRecommendIn10: null,
      topics: [],
    });
  });

  it('maps review_topics in the API order, with the count each filter pages through (#522)', () => {
    const s = toReviewSummary({
      count: 3,
      review_topics: [
        { slug: 'document-preparation', display_name: 'Document preparation', count: 3 },
        { slug: 'interview-preparation', display_name: 'Interview preparation', count: 2 },
        { slug: 'test-preparation', display_name: 'Test preparation', count: 0 },
      ],
    });
    // A review about both counts under both (5 > 3); a topic with none is no chip.
    expect(s.topics).toEqual([
      { slug: 'document-preparation', name: 'Document preparation', count: 3 },
      { slug: 'interview-preparation', name: 'Interview preparation', count: 2 },
    ]);
  });

  it('keeps n in 10 within 0–10', () => {
    expect(toReviewSummary({ count: 1, would_recommend_in_10: 12 }).wouldRecommendIn10).toBe(10);
  });
});
