import type { ReviewAnswers } from '@/types/mentor';
import { toEdit, toMyReview } from './reviewWrite';

const full: ReviewAnswers = {
  overall: 4,
  text: 'Practical, direct feedback on my SOP draft.',
  communication: 'great',
  knowledge: 'great',
  support: 'okay',
  practicality: 'great',
  value: 4,
  recommend: 9,
  platformNote: '',
};

describe('toEdit (PATCH sends only what changed)', () => {
  it('nothing changed: an empty body', () => {
    expect(toEdit(full, full)).toEqual({});
  });

  it('only the changed fields, with the API names', () => {
    expect(toEdit(full, { ...full, overall: 5, support: 'great', recommend: 10 })).toEqual({
      overall_rating: 5,
      support_rating: 'great',
      nps_recommend_score: 10,
    });
  });

  it('trims the text, and clears a removed platform note with null', () => {
    expect(
      toEdit(
        { ...full, platformNote: 'Video link was hard to find.' },
        { ...full, text: `${full.text}  ` },
      ),
    ).toEqual({ private_review: null });
  });

  it('after a reload the API may not return step 2: the form’s unanswered 0s aren’t sent', () => {
    const before = { overall: 4, text: full.text };
    // What ReviewFlow holds when step 2 came back empty and was left alone.
    const form = {
      overall: 5,
      text: full.text,
      communication: undefined,
      knowledge: undefined,
      support: undefined,
      practicality: undefined,
      value: 0,
      recommend: 0,
      platformNote: '',
    } as unknown as ReviewAnswers;
    expect(toEdit(before, form)).toEqual({ overall_rating: 5 });
  });
});

describe('toMyReview', () => {
  it('maps the author’s full read while the window is open', () => {
    const r = toMyReview({
      id: 'r1',
      created_at: '2026-09-29T11:55:00Z',
      session_id: 's1',
      reviewed_for: 'm1',
      editable_until: new Date(Date.now() + 60_000).toISOString(),
      overall_rating: 4,
      public_review: full.text,
      communication_rating: 'great',
      knowledge_rating: 'great',
      support_rating: 'okay',
      practicality_rating: 'great',
      valuable_rating: 4,
      nps_recommend_score: 9,
      private_review: null,
    });
    expect(r.editableUntil).not.toBeNull();
    expect(r.answers).toMatchObject({ overall: 4, support: 'okay', recommend: 9 });
  });

  it('a shut window reads as not editable, whatever the field says', () => {
    const r = toMyReview({
      id: 'r1',
      created_at: '2026-09-29T11:00:00Z',
      editable_until: new Date(Date.now() - 1000).toISOString(),
      session_id: 's1',
      reviewed_for: 'm1',
      public_review: full.text,
      overall_rating: null,
      valuable_rating: 4,
    });
    expect(r.editableUntil).toBeNull();
    // A review from before the stars: its valuable_rating stands in.
    expect(r.answers.overall).toBe(4);
  });
});
