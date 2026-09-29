'use client';

import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { AppError, Remote } from '@/types/mentor';
import type { DeleteError, OwnSessionType, SessionIcon } from '@/types/sessionType';
import {
  copyForField,
  fieldForPointer,
  resolveDefaults,
  type BookingDefaults,
  type FieldErrors,
  type toCreateBody,
  type toWindows,
} from '@/lib/utils/sessionTypeDraft';
import { keyForAttempt } from './booking';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

type OwnSessionTypeRead = components['schemas']['OwnSessionTypeRead'];
type MentorSessionTypeWrite = components['schemas']['MentorSessionTypeWrite'];
type MentorProfileWrite = components['schemas']['MentorProfileWrite'];

// ---- mapping ----------------------------------------------------------------

/**
 * Automatic icon from the topics (design `autoIcon`, re-keyed to the catalog's
 * offering codes — design-divergence.md): the first topic's icon; none, or three
 * or more (a general call), is the video call.
 */
const TOPIC_ICON: Record<string, SessionIcon> = {
  'test-preparation': 'quiz',
  'document-preparation': 'edit_document',
  'school-selection': 'school',
  'program-selection': 'school',
  'scholarships-financial-aid': 'payments',
  'interview-preparation': 'record_voice_over',
};
export function autoIcon(topicCodes: readonly (string | null | undefined)[]): SessionIcon {
  const first = topicCodes[0];
  if (!first || topicCodes.length >= 3) return 'video_call';
  return TOPIC_ICON[first] ?? 'video_call';
}

export function toOwnSessionType(
  r: OwnSessionTypeRead,
  questionCount: number | null,
): OwnSessionType {
  // `service_offerings` (backend #9); the single field is its first, kept for one release.
  const list = r.service_offerings?.length
    ? r.service_offerings
    : r.service_offering
      ? [r.service_offering]
      : [];
  const topics = list.map((o) => ({ code: o.code, label: o.display_name }));
  return {
    id: r.id,
    name: r.name,
    description: r.description?.trim() ?? '',
    durationMin: r.duration_minutes,
    noticeMin: r.min_notice_minutes,
    isLive: r.is_active,
    topics,
    iconChoice: r.icon ?? null,
    icon: r.icon ?? autoIcon(topics.map((t) => t.code)),
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
  // Switches in flight across all rows: the list is refetched once, after the last.
  const inFlight = useRef(0);
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
      inFlight.current += 1;
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData<OwnSessionType[]>(key, (list) =>
        list?.map((t) => (t.id === id ? { ...t, isLive: live } : t)),
      );
    },
    onError: (_e, { id, live }) => {
      // Roll back this row only: another row's switch may be in flight too.
      qc.setQueryData<OwnSessionType[]>(key, (list) =>
        list?.map((t) => (t.id === id ? { ...t, isLive: !live } : t)),
      );
      onFailed(id, live);
    },
    onSettled: () => {
      inFlight.current -= 1;
      // A refetch while another switch is pending could return its old state.
      if (inFlight.current > 0) return;
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
      let result;
      try {
        result = await api.DELETE('/api/v1/me/session-types/{session_type_id}', {
          params: { path: { session_type_id: id } },
        });
      } catch (e) {
        // Network failure: our copy, never the browser's "Failed to fetch".
        throw deleteError(e, null);
      }
      const { error, response } = result;
      // Already gone (deleted from another tab or device): what the mentor wanted.
      if (response.status === 404) return;
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

// ---- create -------------------------------------------------------------------

type CreateBody = ReturnType<typeof toCreateBody>;
type WindowBody = ReturnType<typeof toWindows>[number];

/** A refused create, in our copy: per-field messages when the server named fields. */
export type CreateError = AppError & { fields: FieldErrors };

/**
 * 422 `errors[{pointer, message}]` (backend #5) → our copy on each field; the
 * server's `message` and `detail` are never shown. 409 on create is a name the
 * mentor already uses (backend reply #2), or a replay still in flight.
 */
export function createError(error: unknown, body: unknown): CreateError {
  const e = normaliseError(error);
  const fields: FieldErrors = {};
  if (error instanceof ApiError && error.status === 422) {
    const list = (body as { errors?: unknown } | null)?.errors;
    if (Array.isArray(list)) {
      for (const it of list) {
        const pointer = (it as { pointer?: unknown })?.pointer;
        const f = typeof pointer === 'string' ? fieldForPointer(pointer) : null;
        if (f && !fields[f]) fields[f] = copyForField(f);
      }
    }
    return { ...e, fields, message: 'Some details need another look.' };
  }
  if (error instanceof ApiError && error.status === 409) {
    if (error.type?.includes('idempot'))
      return { ...e, fields, message: 'Still publishing. Give it a moment, then try again.' };
    return {
      ...e,
      fields: { name: 'You already have a session type with this name.' },
      // The field says what; the banner says where to look (not the same sentence twice).
      message: 'Some details need another look.',
    };
  }
  return { ...e, fields, message: `We couldn’t publish it. ${e.message} Try again.` };
}

/** POST each window; the ones that failed come back so they can be retried. */
async function postWindows(id: string, windows: WindowBody[]): Promise<WindowBody[]> {
  const results = await Promise.all(
    windows.map((w) =>
      api
        .POST('/api/v1/me/session-types/{session_type_id}/windows', {
          params: { path: { session_type_id: id } },
          body: w,
        })
        .then((r) => r.response.ok)
        .catch(() => false),
    ),
  );
  return windows.filter((_, i) => !results[i]);
}

export type Created = { id: string; failedWindows: WindowBody[] };

/**
 * POST /me/session-types with its questions in one transaction (backend #1),
 * one Idempotency-Key per attempt (#2) — a double click or a retry of the same
 * body can't create two. Dedicated hours are separate requests after it
 * (backend #15); any that fail are returned, and the type is still created.
 */
export function useCreateSessionType() {
  const qc = useQueryClient();
  const attempt = useRef<{ key: string; body: string } | null>(null);
  const mutation = useMutation<Created, CreateError, { body: CreateBody; windows: WindowBody[] }>({
    mutationFn: async ({ body, windows }) => {
      attempt.current = keyForAttempt(attempt.current, JSON.stringify(body), () =>
        crypto.randomUUID(),
      );
      let result;
      try {
        result = await api.POST('/api/v1/me/session-types', {
          params: { header: { 'Idempotency-Key': attempt.current.key } },
          // The generated type makes every defaulted field required (openapi-typescript);
          // the API requires only question_text, and refuses `allows_multiple`/`options`
          // on a non-choice question (backend #12), so they are sent only on choices.
          body: body as unknown as MentorSessionTypeWrite,
        });
      } catch (e) {
        throw createError(e, null);
      }
      const { data, error, response } = result;
      if (!data) throw createError(apiError(response.status, error), error);
      const failedWindows = windows.length ? await postWindows(data.id, windows) : [];
      return { id: data.id, failedWindows };
    },
    onSuccess: () => {
      attempt.current = null;
      void qc.invalidateQueries({ queryKey: keys.sessionTypes.all });
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
      void qc.invalidateQueries({ queryKey: ['booking'] });
    },
  });
  return {
    create: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/** Retry the dedicated hours that didn't save. Resolves to those still failing. */
export function useRetryWindows() {
  const qc = useQueryClient();
  const mutation = useMutation<WindowBody[], AppError, { id: string; windows: WindowBody[] }>({
    mutationFn: ({ id, windows }) => postWindows(id, windows),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['booking'] }),
  });
  return { retry: mutation.mutateAsync, isPending: mutation.isPending };
}

// ---- the mentor's booking defaults (backend #13, #16) ----------------------------

export type MentorDefaults = BookingDefaults;

const defaultsKey = (userId: string | null) => keys.mentorDefaults(userId ?? 'none');

/** GET /users/{id}/mentor-profile — the defaults a session type inherits. */
export function useMentorDefaults(userId: string | null): Remote<MentorDefaults> {
  const query = useQuery({
    queryKey: defaultsKey(userId),
    enabled: userId !== null,
    queryFn: async ({ signal }): Promise<MentorDefaults> => {
      const { data, error, response } = await api.GET('/api/v1/users/{user_id}/mentor-profile', {
        params: { path: { user_id: userId! } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      const notice = data.default_min_notice_minutes;
      return {
        durationMin: data.default_duration_minutes ?? null,
        noticeHours: notice == null ? null : notice / 60,
        windowDays: data.booking_window_days ?? null,
        breakMin: data.break_after_minutes ?? null,
        requiresApproval: data.requires_booking_confirmation,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/**
 * PATCH /users/{id}/mentor-profile — the Booking preferences modal. Saves every
 * value it shows (resolved), so what the mentor saw is what is stored.
 */
export function useSaveMentorDefaults(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<MentorDefaults, AppError, MentorDefaults>({
    mutationFn: async (next) => {
      const r = resolveDefaults(next);
      const body = {
        default_duration_minutes: r.durationMin,
        default_min_notice_minutes: r.noticeHours * 60,
        booking_window_days: r.windowDays,
        break_after_minutes: r.breakMin,
        requires_booking_confirmation: r.requiresApproval,
      };
      let result;
      try {
        result = await api.PATCH('/api/v1/users/{user_id}/mentor-profile', {
          params: { path: { user_id: userId! } },
          // A partial update: only the booking preferences (the generated type lists every field).
          body: body as MentorProfileWrite,
        });
      } catch (e) {
        throw saveError(e);
      }
      if (!result.response.ok) throw saveError(apiError(result.response.status, result.error));
      return { ...r };
    },
    onSuccess: (saved) => {
      qc.setQueryData(defaultsKey(userId), saved);
      // Everything that follows the defaults: slots, the own list's lengths
      // ("Use my defaults" types), the profile's Sessions tab (review of #60).
      void qc.invalidateQueries({ queryKey: ['booking'] });
      void qc.invalidateQueries({ queryKey: keys.sessionTypes.all });
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
    },
  });
  return {
    save: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/** Our copy for a failed save (PROVISIONAL — design request #7); never the server's. */
function saveError(error: unknown): AppError {
  const e = normaliseError(error);
  return {
    ...e,
    message:
      e.kind === 'offline'
        ? 'You’re offline. Your preferences didn’t save. Try again when you reconnect.'
        : 'Your preferences didn’t save. Try again in a moment.',
  };
}
