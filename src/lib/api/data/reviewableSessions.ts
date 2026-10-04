'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { Remote, ReviewableSession } from '@/types/mentor';
import { remote } from './bookings';
import { apiError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

type ReviewableSessionRead = components['schemas']['ReviewableSessionRead'];

/**
 * Named apart from `reviewWrite.ts`'s `useReviewableSessions`, which asks the
 * same endpoint for **one mentor** (`?mentor_id=`) to drive a profile's Reviews
 * tab. This one takes the whole list. Two exports with one name, differing only
 * in arity, is a trap for whoever imports next.
 */

/** One row as the screen reads it. The same shape the profile's tab uses. */
export function toReviewableSession(s: ReviewableSessionRead): ReviewableSession {
  return {
    id: s.session_id,
    startsAt: s.starts_at,
    // Null on a session migrated from before offerings existed; the caller
    // falls back to naming the mentor rather than the product.
    typeName: s.session_type_name ?? null,
  };
}

/**
 * GET /me/reviewable-sessions — every session the viewer may review right now,
 * newest first. The list comes whole (`next_cursor` is always null).
 *
 * **Trust the list; do not re-derive eligibility.** The backend returns only
 * the caller's sessions *as mentee* that are `completed` (never `no_show`,
 * `cancelled` or `declined`), that they have not already reviewed — a session
 * leaves the list the moment its review is written — and that are not inside
 * the 30-day interval since their last review of the **same session type**
 * (per offering, not per mentor). An empty list means there is nothing to ask
 * about, which is what makes a 409 from `POST /reviews` exceptional.
 *
 * `active`: the tab that offers a review is on show. Nothing fetches until
 * then — a screen with three tabs must not pay for all three.
 *
 * Not to be confused with `useReviewableSessions` in `reviewWrite.ts`, which
 * asks the same endpoint with `?mentor_id=` for one profile's Reviews tab.
 */
export function useMyReviewableSessions(active: boolean): Remote<ReviewableSession[]> {
  const session = useSession();
  const enabled = active && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.bookings.reviewable(sessionKey(session)),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/me/reviewable-sessions', {
        signal,
      });
      if (!data) throw apiError(response.status, error);
      // Newest first is the API's own order; sorted here too so a row that is
      // reviewed and drops out can never leave the rest in another order.
      return data.data
        .map(toReviewableSession)
        .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
    },
    // What is reviewable changes only when a session completes or a review is
    // written, and writing one invalidates this key.
    staleTime: 60_000,
    networkMode: 'always',
    retry: retryOnce,
  });
  // The shared shape, so `isLoading` cannot come to mean one thing here and
  // another in the hook beside it.
  return remote(query, () => void query.refetch(), enabled);
}
