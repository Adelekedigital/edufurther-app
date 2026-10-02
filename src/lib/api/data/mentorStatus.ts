'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { AppError, Remote } from '@/types/mentor';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

/** The mentor's listing as Calendar shows it (the header pill and the busy card). */
export type MentorStatus = {
  /** Listed in search: open for new bookings. */
  listed: boolean;
  /** Paused by the mentor ("Busy"). False when an admin unlisted them: no Busy UI. */
  pausedByMentor: boolean;
  /** The day they plan to be back (YYYY-MM-DD, their zone): a reminder, never an automatic switch. */
  returnOn: string | null;
};

type MentorProfileRead = components['schemas']['MentorProfileRead'];

/** Busy only when the mentor paused themselves (backend #324); an admin unlisting isn't busy. */
export function toMentorStatus(
  p: Pick<MentorProfileRead, 'listing_status'> &
    Partial<Pick<MentorProfileRead, 'paused_by_mentor' | 'return_on'>>,
): MentorStatus {
  return {
    listed: p.listing_status === 'listed',
    pausedByMentor: !!p.paused_by_mentor,
    returnOn: p.return_on ?? null,
  };
}

/** GET /users/{id}/mentor-profile → listed / busy / back on. */
export function useMentorStatus(userId: string | null): Remote<MentorStatus> {
  const query = useQuery({
    queryKey: keys.calendar.status(userId ?? 'none'),
    enabled: userId !== null,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/users/{user_id}/mentor-profile', {
        params: { path: { user_id: userId! } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return toMentorStatus(data);
    },
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/** Our copy for a pause or resume that failed (PROVISIONAL, calendar design request, PR 3). */
export function statusError(error: unknown, pausing: boolean): AppError {
  const e = normaliseError(error);
  const message =
    e.kind === 'offline'
      ? 'You’re offline, so we couldn’t change your availability. Try again when you reconnect.'
      : e.status === 409
        ? // An admin unlisted this mentor: only an admin can relist them (calendar reply #1).
          'Your profile was taken off the listing by EduFurther, so you can’t change this yourself. Contact support.'
        : e.status === 422
          ? 'Pick a return date after today.'
          : pausing
            ? 'We couldn’t set you as busy. Try again.'
            : 'We couldn’t set you as available. Try again.';
  return { ...e, message };
}

/** After a pause or resume: the pill, the profile, search and slots all follow it. */
function useRefreshAfterStatus(userId: string | null) {
  const qc = useQueryClient();
  return async () => {
    void qc.invalidateQueries({ queryKey: keys.viewer.all });
    void qc.invalidateQueries({ queryKey: ['booking'] });
    void qc.invalidateQueries({ queryKey: keys.mentors.all });
    await qc.invalidateQueries({ queryKey: keys.calendar.status(userId ?? 'none') });
  };
}

/**
 * POST /users/{id}/mentor-profile/pause, with an optional return date
 * (`return_on: null` = "Not sure yet"). Again while busy just changes the date. Resolves once
 * the status is read back.
 */
export function usePause(userId: string | null) {
  const refresh = useRefreshAfterStatus(userId);
  const mutation = useMutation<void, AppError, { returnOn: string | null }>({
    mutationFn: async ({ returnOn }) => {
      let r;
      try {
        r = await api.POST('/api/v1/users/{user_id}/mentor-profile/pause', {
          params: { path: { user_id: userId! } },
          body: { return_on: returnOn },
        });
      } catch (e) {
        throw statusError(e, true);
      }
      if (!r.response.ok) throw statusError(apiError(r.response.status, r.error), true);
    },
    onSettled: refresh,
  });
  return {
    pause: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/** POST /users/{id}/mentor-profile/resume ("I'm back"): clears the return date too. */
export function useResume(userId: string | null) {
  const refresh = useRefreshAfterStatus(userId);
  const mutation = useMutation<void, AppError, void>({
    mutationFn: async () => {
      let r;
      try {
        r = await api.POST('/api/v1/users/{user_id}/mentor-profile/resume', {
          params: { path: { user_id: userId! } },
        });
      } catch (e) {
        throw statusError(e, false);
      }
      if (!r.response.ok) throw statusError(apiError(r.response.status, r.error), false);
    },
    onSettled: refresh,
  });
  return {
    resume: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
