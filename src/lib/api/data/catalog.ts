'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ApiError } from './errors';
import { api } from './http';
import { keys } from './keys';

export type CatalogOption = { id: string; label: string };
type Status = 'loading' | 'error' | 'ready';

const HOUR = 60 * 60 * 1000;

async function lookup(
  catalogue: 'countries' | 'languages',
  query: { q?: string; common?: boolean; limit: number },
  signal: AbortSignal,
): Promise<CatalogOption[]> {
  const { data, response } = await api.GET('/api/v1/catalog/{catalogue}', {
    params: { path: { catalogue }, query },
    signal,
  });
  if (!data) throw new ApiError(response.status);
  return data.data.map((l) => ({ id: l.id, label: l.display_name }));
}

/**
 * Every country, for the background selects. One page holds them all (the
 * backend pages at 300; there are about 250). Only fetched while `enabled`
 * (the editor is open).
 */
export function useCountries(enabled: boolean) {
  const query = useQuery({
    queryKey: keys.catalog.countries,
    queryFn: ({ signal }) => lookup('countries', { limit: 300 }, signal),
    enabled,
    // Reference data: it changes on deploys, not during a visit.
    staleTime: HOUR,
  });
  const status: Status = query.error ? 'error' : query.data ? 'ready' : 'loading';
  return { countries: query.data ?? [], status, retry: () => void query.refetch() };
}

/**
 * Languages matching what the owner typed; the common set while it's empty.
 * The catalog holds thousands (ISO 639-3), so it's searched, never listed
 * whole (backend). Typing waits 250ms before searching; the last results stay
 * while the next ones load.
 */
export function useLanguageSearch(q: string, enabled: boolean) {
  const [term, setTerm] = useState(q.trim());
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const query = useQuery({
    queryKey: keys.catalog.languages(term),
    queryFn: ({ signal }) =>
      lookup('languages', term ? { q: term, limit: 50 } : { common: true, limit: 50 }, signal),
    enabled,
    staleTime: HOUR,
    placeholderData: keepPreviousData,
  });
  const status: Status = query.error
    ? 'error'
    : query.isFetching || term !== q.trim()
      ? 'loading'
      : 'ready';
  return { results: query.data ?? [], status, retry: () => void query.refetch() };
}
