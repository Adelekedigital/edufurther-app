import type { Mentor } from '@/types/mentor';
import type { MentorMatch } from '@/types/onboarding';
import { goalLineFrom, recommendedFrom } from './recommended';

const TOPICS = [
  { id: 't1', slug: 'scholarships', label: 'Scholarships & funding' },
  { id: 't2', slug: 'documents', label: 'Application documents' },
];

const match = (id: string, reasons: MentorMatch['reasons']): MentorMatch => ({
  mentor: { id, name: id } as Mentor,
  reasons,
  level: null,
  studyCountry: null,
});

describe('recommendedFrom', () => {
  it('keeps the backend order and names the matched areas', () => {
    const out = recommendedFrom(
      [
        match('a', [{ code: 'help_areas', slugs: ['documents'] }]),
        match('b', [
          { code: 'field', field: 'Public Health' },
          { code: 'help_areas', slugs: ['scholarships', 'documents'] },
          { code: 'help_areas', slugs: ['scholarships'] },
        ]),
      ],
      TOPICS,
    );
    expect(out.map((r) => r.mentor.id)).toEqual(['a', 'b']);
    expect(out[0]!.matchTopics).toEqual(['Application documents']);
    // Other reasons are ignored; an area named twice shows once.
    expect(out[1]!.matchTopics).toEqual(['Scholarships & funding', 'Application documents']);
  });

  it('skips an area the catalogue does not know', () => {
    const out = recommendedFrom([match('a', [{ code: 'help_areas', slugs: ['gone'] }])], TOPICS);
    expect(out[0]!.matchTopics).toEqual([]);
  });
});

describe('goalLineFrom', () => {
  it('joins the goal’s help areas in catalogue words, or is null with none', () => {
    expect(goalLineFrom(['t1', 't2'], TOPICS)).toBe(
      'Scholarships & funding, Application documents',
    );
    expect(goalLineFrom(['zz'], TOPICS)).toBeNull();
    expect(goalLineFrom([], TOPICS)).toBeNull();
  });
});
