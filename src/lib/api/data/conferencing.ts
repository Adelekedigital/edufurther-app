'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { AppError, Remote } from '@/types/mentor';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

export type VideoProvider = components['schemas']['ConferencingProvider'];
export type Conferencing = {
  provider: VideoProvider;
  customUrl: string | null;
  /** Never chosen: the platform default (EduFurther video) applies. */
  isDefault: boolean;
};

/** GET /me/conferencing: where the mentor's sessions run by default (backend #323). */
export function useConferencing(
  userId: string | null,
): Remote<Conferencing> & { retrying: boolean } {
  const query = useQuery({
    queryKey: keys.calendar.video(userId ?? 'none'),
    enabled: userId !== null,
    queryFn: async ({ signal }): Promise<Conferencing> => {
      const { data, error, response } = await api.GET('/api/v1/me/conferencing', { signal });
      if (!data) throw apiError(response.status, error);
      return {
        provider: data.provider,
        customUrl: data.custom_url ?? null,
        isDefault: data.is_default_choice,
      };
    },
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
    retrying: query.isFetching,
  };
}

/** Our copy for a failed save (PROVISIONAL, calendar design request, PR 3). */
function videoError(error: unknown): AppError {
  const e = normaliseError(error);
  return {
    ...e,
    message:
      e.kind === 'offline'
        ? 'You’re offline, so we couldn’t save your video setting. Try again when you reconnect.'
        : 'We couldn’t save your video setting. Try again.',
  };
}

/**
 * PATCH /me/conferencing. A personal link keeps its URL; any other provider
 * sends none (the backend refuses a URL for them).
 */
export function useSaveConferencing(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<
    void,
    AppError,
    { provider: VideoProvider; customUrl: string | null }
  >({
    mutationFn: async ({ provider, customUrl }) => {
      let r;
      try {
        r = await api.PATCH('/api/v1/me/conferencing', {
          body: { provider, custom_url: provider === 'custom' ? customUrl : null },
        });
      } catch (e) {
        throw videoError(e);
      }
      if (!r.response.ok) throw videoError(apiError(r.response.status, r.error));
    },
    onSettled: async () => {
      // Session types that follow the default show the new venue.
      void qc.invalidateQueries({ queryKey: keys.sessionTypes.all });
      await qc.invalidateQueries({ queryKey: keys.calendar.video(userId ?? 'none') });
    },
  });
  return {
    save: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
