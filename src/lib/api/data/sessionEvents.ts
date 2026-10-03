'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { Booking, BookingStatus } from '@/types/booking';
import type { Remote } from '@/types/mentor';
import { apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

type SessionEventRead = components['schemas']['SessionEventRead'];

/**
 * Why a session ended the way it did, in the words of whoever ended it.
 *
 * This is the **only** place the written reason lives: `SessionRead` carries
 * the status but never the message (backend reply, 2026-10-03). A cancelled
 * session with no explanation is the thing people open a past booking to find
 * out about, so the details panel fetches it — for History rows only, since
 * nothing has been decided yet on the others.
 */
export type BookingOutcome = {
  status: BookingStatus;
  /** What they wrote. Null when nobody wrote anything. */
  reason: string | null;
  /**
   * Who did it, from the viewer's side: `them` is the other party, `you` the
   * viewer, `system` an expiry or no-show sweep with no person behind it.
   */
  by: 'you' | 'them' | 'system';
  at: string;
};

const STATUS: Record<SessionEventRead['to_status'], BookingStatus> = {
  pending_mentor_approval: 'pending',
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'cancelled',
  declined: 'declined',
  expired: 'expired',
  no_show: 'noShow',
  withdrawn: 'withdrawn',
};

/** The outcomes worth explaining. "Completed" needs no reason. */
const EXPLAINED: BookingStatus[] = ['cancelled', 'declined', 'withdrawn', 'expired', 'noShow'];

/**
 * The event that put this booking in the state it is in. Null when the status
 * is not one that calls for an explanation, or no event matches — a migrated
 * row may have none, which is silence, not an error.
 */
export function outcomeOf(
  events: SessionEventRead[],
  booking: Booking,
  viewerId: string,
): BookingOutcome | null {
  if (!EXPLAINED.includes(booking.status)) return null;
  // Last first: a session can reach the same state more than once in theory,
  // and the most recent event is the one that explains where it sits now.
  const event = [...events]
    .reverse()
    .find((e) => STATUS[e.to_status] === booking.status);
  if (!event) return null;
  const by =
    event.actor_type !== 'user' || !event.actor_id
      ? 'system'
      : event.actor_id === viewerId
        ? 'you'
        : 'them';
  return {
    status: booking.status,
    reason: event.reason_text?.trim() || null,
    by,
    at: event.created_at,
  };
}

/**
 * GET /sessions/{id}/events, returned whole (no paging). `active`: the panel
 * is open on a row whose outcome is worth explaining — this never fires for
 * Upcoming or Pending.
 */
export function useBookingOutcome(
  booking: Booking | null,
  viewerId: string | null,
  active: boolean,
): Remote<BookingOutcome | null> {
  const session = useSession();
  const explained = !!booking && EXPLAINED.includes(booking.status);
  const enabled = active && explained && !!viewerId && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.bookings.events(booking?.id ?? '', sessionKey(session)),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/sessions/{session_id}/events', {
        params: { path: { session_id: booking!.id } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return outcomeOf(data.data, booking!, viewerId!);
    },
    // The past does not change.
    staleTime: 5 * 60_000,
    networkMode: 'always',
    retry: retryOnce,
  });
  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    error: query.isError ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}
