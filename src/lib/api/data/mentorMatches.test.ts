import { describe, expect, it, vi } from 'vitest';
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
          level: { id: 'dl-masters', label: 'Master’s' },
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
    const w: WireMatches = { matches: [], exact: true, based_on: {}, for_mentor_bookable: false };
    expect(toMatches(w, []).forMentorBookable).toBe(false);
    // Sent only with for_mentor: null (or absent) never reads as unbookable.
    expect(toMatches({ ...w, for_mentor_bookable: null }, []).forMentorBookable).toBe(true);
  });

  it('reads the fallback line from the match item’s own refs, never an object', () => {
    const w: WireMatches = {
      matches: [
        {
          mentor,
          reasons: [],
          level: { id: 'dl-masters', label: 'Master’s' },
          study_country: { id: 'c-gb', label: 'United Kingdom' },
        },
      ],
      exact: false,
      based_on: {},
    };
    const m = toMatches(w, []).matches[0]!;
    expect(m.level).toBe('Master’s');
    expect(m.studyCountry).toBe('United Kingdom');
    // No refs: the card's own country, and no level.
    const bare = toMatches({ ...w, matches: [{ mentor, reasons: [] }] }, []).matches[0]!;
    expect(bare).toMatchObject({ level: null, studyCountry: 'United Kingdom' });
  });

  it('maps the country, origin and field reasons, and an empty basis to nothing', () => {
    const uk = { id: 'c-gb', label: 'United Kingdom' };
    const w: WireMatches = {
      matches: [
        {
          mentor,
          reasons: [
            { code: 'field', field: 'International Law' },
            { code: 'origin', country: { id: 'c-ng', label: 'Nigeria' } },
            { code: 'study_country', country: uk },
          ],
        },
      ],
      exact: true,
      based_on: {},
    };
    const m = toMatches(w, []);
    expect(m.matches[0]!.reasons).toEqual([
      { code: 'field', field: 'International Law' },
      { code: 'origin', country: { id: 'c-ng', label: 'Nigeria' } },
      { code: 'study_country', country: uk },
    ]);
    expect(m.basis).toEqual({ degree: null, field: null, country: null, origin: null });
  });

  it('says levels in our words, not the backend’s “Master’s Degree”, and keeps MBA', () => {
    const levels = [{ id: 'dl-masters', code: 'masters' }];
    const deg = { id: 'dl-masters', label: 'Master’s Degree' };
    const w: WireMatches = {
      matches: [{ mentor, reasons: [{ code: 'degree', level: deg }], level: deg }],
      exact: true,
      based_on: { degree: { ...deg, raw: null }, field: 'Public Health' },
    };
    const m = toMatches(w, [], levels);
    expect(m.basis.degree).toBe('Master’s');
    expect(m.matches[0]!.level).toBe('Master’s');
    expect(m.matches[0]!.reasons).toEqual([{ code: 'degree', level: 'Master’s' }]);
    // The mentee chose MBA: said as chosen.
    expect(
      toMatches({ ...w, based_on: { degree: { ...deg, raw: 'MBA' } } }, [], levels).basis.degree,
    ).toBe('MBA');
    // A catalogue level we have no word for (Diploma) keeps the backend's name.
    const dip = { id: 'dl-diploma', label: 'Diploma' };
    expect(
      toMatches(
        { ...w, based_on: { degree: { ...dip, raw: null } } },
        [],
        [...levels, { id: 'dl-diploma', code: 'diploma' }],
      ).basis.degree,
    ).toBe('Diploma');
    // An unknown level keeps the backend's name.
    expect(toMatches(w, [], []).basis.degree).toBe('Master’s Degree');
  });
});

describe('useMentorMatches', () => {
  it('asks for the limit it is given, and keeps each limit in its own cache entry', async () => {
    const { renderHook, waitFor } = await import('@testing-library/react');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { createElement } = await import('react');
    const { useMentorMatches } = await import('./mentorMatches');
    const { api } = await import('./http');
    const body = { matches: [], exact: true, based_on: {}, for_mentor_bookable: true };
    const get = vi
      .spyOn(api, 'GET')
      .mockResolvedValue({ data: body, response: { ok: true, status: 200 } } as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    const { result } = renderHook(
      () => useMentorMatches('me', [], [], { enabled: true, limit: 6 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(get).toHaveBeenCalledWith(
      '/api/v1/me/mentor-matches',
      expect.objectContaining({ params: { query: { limit: 6 } } }),
    );
    expect(
      client.getQueryCache().find({ queryKey: ['onboarding', 'matches', 'me', '', 6] }),
    ).toBeTruthy();
    get.mockRestore();
  });
});
