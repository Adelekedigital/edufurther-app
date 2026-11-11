import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { track } from '@/lib/analytics/track';
import { useSearchEvent } from './useSearchEvent';

vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));

type Results = Parameters<typeof useSearchEvent>[2];
const results = (over: Partial<Results> = {}): Results => ({
  mentors: [{}, {}],
  total: 7,
  isLoading: false,
  isRefreshing: false,
  error: null,
  ...over,
});
type Args = { q: string; offerings: string[]; r: Results };
const mount = (initial: Args) =>
  renderHook(({ q, offerings, r }: Args) => useSearchEvent(q, offerings, r), {
    initialProps: initial,
    wrapper: StrictMode,
  });

describe('useSearchEvent: mentor_search_performed (PRD 30)', () => {
  beforeEach(() => vi.mocked(track).mockClear());

  it('the plain list is no search', () => {
    mount({ q: '', offerings: [], r: results() });
    expect(track).not.toHaveBeenCalled();
  });

  it('once per settled search, when its results land: the length, never the text', () => {
    const { rerender } = mount({ q: 'oxford', offerings: [], r: results({ isRefreshing: true }) });
    expect(track).not.toHaveBeenCalled();
    rerender({ q: 'oxford', offerings: ['cv'], r: results({ isRefreshing: true }) });
    rerender({ q: 'oxford', offerings: ['cv'], r: results({ total: 3 }) });
    rerender({ q: 'oxford', offerings: ['cv'], r: results({ total: 3 }) });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('mentor_search_performed', {
      query_length: 6,
      filter_count: 1,
      result_count: 3,
    });
  });

  it('counts the loaded page when no total came; a failed search is not counted', () => {
    const { rerender } = mount({
      q: 'ab',
      offerings: [],
      r: results({ error: { kind: 'server' } }),
    });
    expect(track).not.toHaveBeenCalled();
    rerender({ q: 'ab', offerings: [], r: results({ total: null }) });
    expect(track).toHaveBeenLastCalledWith('mentor_search_performed', {
      query_length: 2,
      filter_count: 0,
      result_count: 2,
    });
  });

  it('the same search after clearing counts again; filters in another order do not', () => {
    const { rerender } = mount({ q: '', offerings: ['a', 'b'], r: results() });
    rerender({ q: '', offerings: ['b', 'a'], r: results() });
    expect(track).toHaveBeenCalledTimes(1);
    rerender({ q: '', offerings: [], r: results() });
    rerender({ q: '', offerings: ['a', 'b'], r: results() });
    expect(track).toHaveBeenCalledTimes(2);
  });
});
