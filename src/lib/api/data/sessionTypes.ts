'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { Remote } from '@/types/mentor';
import type { DeleteError, OwnSessionType, SessionIcon } from '@/types/sessionType';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

type OwnSessionTypeRead = components['schemas']['OwnSessionTypeRead'];

// ---- mapping ----------------------------------------------------------------

/**
 * Automatic icon from the topic (design `autoIcon`, re-keyed to the six catalog
 * offerings — design-divergence.md). No topic: the video call.
 */
const TOPIC_ICON: Record<string, SessionIcon> = {
  'school-selection': 'school',
  'program-selection': 'school',
  'visa-and-interview': 'record_voice_over',
  'application-documents': 'edit_document',
  'career-guidance': 'badge',
  'scholarships-and-funding': 'payments',
};
export function autoIcon(topicCode: string | null | undefined): SessionIcon {
  return (topicCode && TOPIC_ICON[topicCode]) || 'video_call';
}

export function toOwnSessionType(
  r: OwnSessionTypeRead,
  questionCount: number | null,
): OwnSessionType {
  const topic = r.service_offering
    ? { code: r.service_offering.code, label: r.service_offering.display_name }
    : null;
  return {
    id: r.id,
    name: r.name,
    description: r.description?.trim() ?? '',
    durationMin: r.duration_minutes,
    noticeMin: r.min_notice_minutes,
    isLive: r.is_active,
    topic,
    iconChoice: r.icon ?? null,
    icon: r.icon ?? autoIcon(topic?.code),
    questionCount,
  };
}

/**
 * DELETE refused while sessions are booked on it: 409
 * `/problems/session-type-has-bookings` + `booked_count` (backend #4). Any 409 on
 * DELETE means this (backend reply #4), so the type is a hint, not a gate.
 */
export function deleteError(error: unknown, body: unknown): DeleteError {
  const e = normaliseError(error);
  if (error instanceof ApiError && error.status === 409) {
    const n = (body as { booked_count?: unknown } | null)?.booked_count;
    return {
      ...e,
      hasBookings: true,
      bookedCount: typeof n === 'number' && n > 0 ? n : undefined,
      message: 'Sessions are still booked on it.',
    };
  }
  if (e.kind === 'notFound') return { ...e, message: 'It was already deleted.' };
  return { ...e, message: `We couldn’t delete it. ${e.message} Try again.` };
}

// ---- hooks ------------------------------------------------------------------

/** The session identity, so one mentor's list never shows for another. */
function useWho(): string {
  return sessionKey(useSession());
}

/**
 * GET /me/session-types, with each form's question count (GET …/questions per
 * type; a form holds at most 5, and a mentor offers a handful). A count that
 * fails to load hides that chip rather than failing the list.
 */
export function useOwnSessionTypes(enabled: boolean): Remote<OwnSessionType[]> {
  const who = useWho();
  const query = useQuery({
    queryKey: keys.sessionTypes.own(who),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/me/session-types', { signal });
      if (!data) throw apiError(response.status, error);
      const counts = await Promise.all(
        data.data.map(async (t) => {
          const q = await api
            .GET('/api/v1/me/session-types/{session_type_id}/questions', {
              params: { path: { session_type_id: t.id } },
              signal,
            })
            .catch(() => null);
          return q?.data ? q.data.data.length : null;
        }),
      );
      return data.data.map((t, i) => toOwnSessionType(t, counts[i] ?? null));
    },
    staleTime: 30 * 1000,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && enabled,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/**
 * PATCH is_active — the Live switch. Optimistic: the switch moves at once and
 * rolls back if the server refuses; `onFailed` lets the row say so (a silent
 * rollback reads as the app ignoring the click).
 */
export function useSetLive(onFailed: (id: string, live: boolean) => void) {
  const qc = useQueryClient();
  const who = useWho();
  const key = keys.sessionTypes.own(who);
  const mutation = useMutation({
    mutationFn: async ({ id, live }: { id: string; live: boolean }) => {
      const { data, error, response } = await api.PATCH(
        '/api/v1/me/session-types/{session_type_id}',
        { params: { path: { session_type_id: id } }, body: { is_active: live } },
      );
      if (!data) throw apiError(response.status, error);
      return data;
    },
    onMutate: async ({ id, live }) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<OwnSessionType[]>(key);
      qc.setQueryData<OwnSessionType[]>(key, (list) =>
        list?.map((t) => (t.id === id ? { ...t, isLive: live } : t)),
      );
      return { before };
    },
    onError: (_e, { id, live }, ctx) => {
      if (ctx?.before) qc.setQueryData(key, ctx.before);
      onFailed(id, live);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      // What mentees can book changed: Explore cards and the public profile.
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
      void qc.invalidateQueries({ queryKey: ['booking'] });
    },
  });
  return (id: string, live: boolean) => mutation.mutate({ id, live });
}

/** DELETE /me/session-types/{id}. Not optimistic: it waits for the confirm modal's answer. */
export function useDeleteSessionType() {
  const qc = useQueryClient();
  const who = useWho();
  const mutation = useMutation<void, DeleteError, string>({
    mutationFn: async (id) => {
      const { error, response } = await api.DELETE('/api/v1/me/session-types/{session_type_id}', {
        params: { path: { session_type_id: id } },
      });
      if (!response.ok) throw deleteError(apiError(response.status, error), error);
    },
    onSuccess: (_d, id) => {
      qc.setQueryData<OwnSessionType[]>(keys.sessionTypes.own(who), (list) =>
        list?.filter((t) => t.id !== id),
      );
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
      void qc.invalidateQueries({ queryKey: ['booking'] });
    },
  });
  return {
    remove: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
