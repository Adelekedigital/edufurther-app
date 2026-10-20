'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppError, Remote } from '@/types/mentor';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

/**
 * Why a grant stopped working. `last_error` is one of a fixed set of the
 * backend's own sentences, never a provider message, and the spec now says so
 * and tells clients to do exactly this: copy per value, and a generic line for
 * one we do not recognise, so a reason added later degrades rather than
 * showing nothing. The set is generated from the domain layer, so a third
 * value cannot appear without appearing in the spec we download.
 */
export type ConnectionFault = 'revoked' | 'unreadable' | 'unknown';

export type CalendarConnection = {
  connectedAt: string;
  /** `error` means reconnect. A transient failure never sets it (backend #5). */
  status: 'active' | 'error';
  /** When the sweep last confirmed it works. Null until the sweep has run. */
  lastSyncedAt: string | null;
  fault: ConnectionFault | null;
  /**
   * Which Google account this grant belongs to. **Null is "not known", never
   * "none"**: a grant made before the consent asked for it carries no address
   * and cannot be backfilled, so it only appears if they reconnect.
   */
  accountEmail: string | null;
};

function faultFrom(lastError: string | null | undefined): ConnectionFault | null {
  if (!lastError) return null;
  if (lastError.includes('revoked') || lastError.includes('expired')) return 'revoked';
  if (lastError.includes('could not be opened')) return 'unreadable';
  return 'unknown';
}

/**
 * GET /me/calendar. `null` means never connected, or disconnected — the
 * endpoint does not distinguish, by design. Not mentor-gated: a signed-in
 * non-mentor gets `200 null`, never a 403 (backend reply #2).
 */
export function useCalendarConnection(
  userId: string | null,
): Remote<CalendarConnection | null> & { retrying: boolean } {
  const query = useQuery({
    queryKey: keys.calendar.connection(userId ?? 'none'),
    enabled: userId !== null,
    queryFn: async ({ signal }): Promise<CalendarConnection | null> => {
      const { data, error, response } = await api.GET('/api/v1/me/calendar', { signal });
      if (!response.ok) throw apiError(response.status, error);
      if (!data) return null;
      return {
        connectedAt: data.connected_at,
        status: data.status === 'error' ? 'error' : 'active',
        lastSyncedAt: data.last_synced_at ?? null,
        fault: faultFrom(data.last_error),
        accountEmail: data.account_email ?? null,
      };
    },
  });
  return {
    // `undefined` is "not loaded"; `null` is "nothing connected", and is an answer.
    data: query.data ?? null,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
    retrying: query.isFetching,
  };
}

/**
 * A direct read, for polling while consent is open. The cached query would
 * answer with what we already knew, which is exactly what we are waiting to
 * stop being true.
 */
export async function readCalendarConnection(
  signal?: AbortSignal,
): Promise<CalendarConnection | null> {
  const { data, response } = await api.GET('/api/v1/me/calendar', { signal });
  if (!response.ok || !data) return null;
  return {
    connectedAt: data.connected_at,
    status: data.status === 'error' ? 'error' : 'active',
    lastSyncedAt: data.last_synced_at ?? null,
    fault: faultFrom(data.last_error),
    accountEmail: data.account_email ?? null,
  };
}

/**
 * The consent URL, for a popup opened before this resolves.
 *
 * A 500 here is not a failure to retry: it means this deployment has no Google
 * client configured, which is the case on dev and locally today (backend reply
 * #1). It is reported as `unconfigured` so the screen can say so instead of
 * offering a Try again that can never succeed.
 */
export type StartConnectResult =
  | { ok: true; consentUrl: string }
  | { ok: false; reason: 'unconfigured' | 'offline' | 'failed' };

export function useStartCalendarConnect() {
  const mutation = useMutation<StartConnectResult, AppError, void>({
    mutationFn: async () => {
      let r;
      try {
        r = await api.GET('/api/v1/me/calendar/connect');
      } catch (e) {
        // Being offline is not our fault, and saying it is sends a mentor
        // looking for a problem on our side that isn't there.
        return { ok: false, reason: normaliseError(e).kind === 'offline' ? 'offline' : 'failed' };
      }
      if (r.response.status === 500) return { ok: false, reason: 'unconfigured' };
      const url = (r.data as { consent_url?: string } | undefined)?.consent_url;
      if (!r.response.ok || !url) return { ok: false, reason: 'failed' };
      return { ok: true, consentUrl: url };
    },
  });
  return { start: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Our copy for a failed disconnect. */
function disconnectError(error: unknown): AppError {
  const e = normaliseError(error);
  return {
    ...e,
    message:
      e.kind === 'offline'
        ? 'You’re offline, so we couldn’t disconnect Google Calendar. Try again when you reconnect.'
        : 'We couldn’t disconnect Google Calendar. Try again.',
  };
}

/**
 * DELETE /me/calendar. A 404 means nothing was connected — the end state the
 * caller asked for, so it resolves rather than throwing.
 *
 * Slots are computed per request with no server cache, so invalidating them is
 * correct immediately. Mentor cards are deliberately NOT invalidated:
 * `next_available_at` is server-stored and refreshed by a job, so re-reading it
 * would only replace one stale value with another (backend reply #7).
 */
export function useDisconnectCalendar(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<void, AppError, void>({
    mutationFn: async () => {
      let r;
      try {
        r = await api.DELETE('/api/v1/me/calendar');
      } catch (e) {
        throw disconnectError(e);
      }
      if (!r.response.ok && r.response.status !== 404) {
        throw disconnectError(apiError(r.response.status, r.error));
      }
    },
    onSettled: async () => {
      if (userId) void qc.invalidateQueries({ queryKey: keys.booking.slotsFor(userId) });
      await qc.invalidateQueries({ queryKey: keys.calendar.connection(userId ?? 'none') });
    },
  });
  return {
    disconnect: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * After a successful connect: the same two queries a disconnect refreshes.
 * Returns the refetch so the caller can hold its busy state until the row is
 * true — otherwise it reads "Connect" for a moment after announcing success.
 */
export function useRefreshAfterConnect(userId: string | null) {
  const qc = useQueryClient();
  return async () => {
    if (userId) void qc.invalidateQueries({ queryKey: keys.booking.slotsFor(userId) });
    await qc.invalidateQueries({ queryKey: keys.calendar.connection(userId ?? 'none') });
  };
}
