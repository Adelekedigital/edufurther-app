import { describe, expect, it } from 'vitest';
import type { components } from '@/lib/api/generated/schema';
import { toMatches, type WireMatches } from './mentorMatches';

const mentor = {
  id: 'm1',
  slug: 'ada-obi',
  first_name: 'Ada',
  last_name: 'Obi',
  completed_sessions: 3,
  review_count: 1,
  primary_study_country: 'United Kingdom',
} as components['schemas']['MentorSummaryRead'];

const topics = [{ id: 'o-doc', slug: 'document-preparation', label: 'Document preparation' }];

describe('toMatches', () => {
  it('maps reasons to the codes the copy is keyed by, and keeps the chosen degree word', () => {
    const w: WireMatches = {
      matches: [
        {
          mentor,
          reasons: [
            { code: 'degree', level: { id: 'dl-masters', label: 'Master’s' } },
            { code: 'help_areas', offering_ids: ['o-doc', 'gone'] },
            { code: 'unknown' } as never,
          ],
          level: 'Master’s',
        },
      ],
      exact: false,
      based_on: {
        degree: { id: 'dl-masters', label: 'Masters', raw: 'MBA' },
        field: 'Law',
        country: null,
        origin: { id: 'c-ng', label: 'Nigeria' },
      },
    };
    const m = toMatches(w, topics);
    expect(m.matches[0]!.reasons).toEqual([
      { code: 'degree', level: 'Master’s' },
      { code: 'help_areas', slugs: ['document-preparation'] },
    ]);
    // Falls back to the card's own study country.
    expect(m.matches[0]!.studyCountry).toBe('United Kingdom');
    expect(m.basis).toEqual({ degree: 'MBA', field: 'Law', country: null, origin: 'Nigeria' });
    expect(m.exact).toBe(false);
    expect(m.forMentorBookable).toBe(true);
  });

  it('reads a picked mentor who is no longer bookable (PRD rev 93)', () => {
    const w: WireMatches = { matches: [], exact: true, based_on: null, for_mentor_bookable: false };
    expect(toMatches(w, []).forMentorBookable).toBe(false);
  });
});
