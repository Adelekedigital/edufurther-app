'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { Remote } from '@/types/mentor';
import type { SessionRoom } from '@/types/booking';
import { apiError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { remote, toBooking, toParty } from './bookings';
import { sessionKey, useSession } from './session';
import { sessionPhase } from '@/lib/utils/sessionPhase';

type SessionRead = components['schemas']['SessionRead'];

/**
 * How often the join page re-reads the session. Presence is `joined_at` on each
 * party (backend reply §1), so polling is the whole of "live": a quarter-minute
 * while someone may arrive, a minute while it is still ahead (a cancellation
 * should not go unseen) or waiting on the hourly attendance sweep, and never
 * once the outcome is settled.
 */
export const ROOM_POLL_MS = 15_000;
const SLOW_POLL_MS = 60_000;

export function pollInterval(room: SessionRoom | undefined, now = new Date()): number | false {
  if (!room) return false;
  switch (sessionPhase(room.booking, now)) {
    case 'soon':
    case 'ongoing':
    case 'closed':
      return ROOM_POLL_MS;
    case 'upcoming':
    case 'settling':
      return SLOW_POLL_MS;
    default:
      return false;
  }
}

export function toSessionRoom(s: SessionRead, viewerId: string): SessionRoom {
  const booking = toBooking(s, viewerId);
  return {
    booking,
    me: toParty(booking.side === 'mentor' ? s.mentor : s.mentee),
    typeName: s.session_type?.name?.trim() || null,
    provider: s.meeting_provider ?? null,
  };
}

/**
 * One session for the join page (GET /sessions/{id}), re-read on `pollInterval`.
 * TanStack pauses the interval while the tab is hidden
 * (`refetchIntervalInBackground` is off) and refetches on focus, so a page left
 * in a background tab costs nothing.
 */
export function useSessionRoom(id: string, userId: string | null): Remote<SessionRoom> {
  const session = useSession();
  const enabled = !!userId && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.bookings.room(id, sessionKey(session)),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/sessions/{session_id}', {
        params: { path: { session_id: id } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return toSessionRoom(data, userId!);
    },
    staleTime: 10_000,
    refetchInterval: (q) => pollInterval(q.state.data),
    networkMode: 'always',
    retry: retryOnce,
  });
  return remote(query, () => void query.refetch(), enabled);
}
