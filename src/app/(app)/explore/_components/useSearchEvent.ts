'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/track';

type Results = {
  mentors: unknown[];
  total: number | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: unknown;
};

/**
 * `mentor_search_performed` (PRD 30): once per settled search, when its
 * results arrive. `q` is the debounced query (never sent, only its length),
 * so typing doesn't count each key. The plain list with nothing searched or
 * picked is no search. The same search again after clearing counts again;
 * a refetch or "Show more" of the one on screen doesn't.
 */
export function useSearchEvent(q: string, offerings: string[], results: Results) {
  const counted = useRef<string | null>(null);
  const searching = q.length > 0 || offerings.length > 0;
  const key = JSON.stringify([q, [...offerings].sort()]);
  const settled = !results.isLoading && !results.isRefreshing && !results.error;
  const resultCount = results.total ?? results.mentors.length;

  useEffect(() => {
    if (!searching) {
      counted.current = null;
      return;
    }
    if (!settled || counted.current === key) return;
    counted.current = key;
    track('mentor_search_performed', {
      query_length: q.length,
      filter_count: offerings.length,
      result_count: resultCount,
    });
    // `key` stands for q and offerings; the count is read as the results land.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, settled, key]);
}
