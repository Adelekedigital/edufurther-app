'use client';

import { useRef } from 'react';
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { AppError, Remote } from '@/types/mentor';
import type {
  ApplicationStage,
  DeleteError,
  DeleteResult,
  OwnSessionType,
  SessionIcon,
} from '@/types/sessionType';
import {
  copyForField,
  fieldForPointer,
  resolveDefaults,
  type BookingDefaults,
  type FieldErrors,
  type toCreateBody,
  type toWindows,
} from '@/lib/utils/sessionTypeDraft';
import { useLatest } from '@/lib/utils/useLatest';
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

/**
 * The stages a session type is aimed at, in the mentor's order; `[]` = any
 * stage (then the old field isn't read). The single `application_stage` is the
 * deprecated form, read while a response still lacks the list (backend round 3).
 */
export function stagesOf(r: {
  application_stages?: ApplicationStage[] | null;
  application_stage?: ApplicationStage | null;
}): ApplicationStage[] {
  return r.application_stages ?? (r.application_stage ? [r.application_stage] : []);
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
    stages: stagesOf(r),
    customStage: r.custom_stage_label?.trim() || null,
    topics,
    iconChoice: r.icon ?? null,
    icon: r.icon ?? autoIcon(topics.map((t) => t.code)),
    questionCount,
    isFeatured: r.is_featured,
    pendingDeletion: r.pending_deletion
      ? {
          deletesAfter: r.pending_deletion.deletes_after ?? null,
          bookedCount: r.pending_deletion.booked_count,
        }
      : null,
    booked: { count: r.booked_count, lastEndsAt: r.last_booked_ends_at ?? null },
  };
}

/** A refused delete, in our copy (a booked type is scheduled now, not refused). */
export function deleteError(error: unknown): DeleteError {
  const e = normaliseError(error);
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
/**
 * Every write to a row shares one key, so the list is refetched once, after
 * the last one settles: a refetch while another write is pending could return
 * its old state and flicker the row back (review of #80). A write from another
 * screen (the profile's quick edits) joins it through `rowWrite`.
 */
export const ROW_WRITE = ['sessionTypes', 'rowWrite'] as const;
// A real setTimeout: a test with fake timers must advance them to see the refetch.
const settling = new WeakSet<QueryClient>();
function settleRowWrite(qc: QueryClient) {
  // Checked after this mutation stops counting as pending, and once for writes
  // settling in the same tick: otherwise each sees the other and none refetches.
  if (settling.has(qc)) return;
  settling.add(qc);
  setTimeout(() => {
    settling.delete(qc);
    if (qc.isMutating({ mutationKey: ROW_WRITE }) > 0) return;
    void qc.invalidateQueries({ queryKey: keys.sessionTypes.all });
    // What mentees can book, and the featured type: Explore cards and the profile.
    void qc.invalidateQueries({ queryKey: keys.mentors.all });
    void qc.invalidateQueries({ queryKey: ['booking'] });
  }, 0);
}
/** Restores in flight, by row, so each "Keep it" waits on its own. */
const RESTORE = [...ROW_WRITE, 'restore'] as const;
/**
 * Everything a row write needs, in one piece so none is forgotten: the shared
 * key, failing at once offline (our copy says so) rather than pausing (a paused
 * write would count as pending and hold every refetch back), and the settle.
 */
export function rowWrite(qc: QueryClient, mutationKey: readonly string[] = ROW_WRITE) {
  return {
    mutationKey,
    networkMode: 'always' as const,
    onSettled: () => settleRowWrite(qc),
  };
}

/**
 * A refused write (422) may be a window above a platform cap lowered since the
 * mentor's defaults were cached: reload them, so the form offers the current cap.
 */
export function refreshLimitsOnRefusal(qc: QueryClient, error: { status?: number }) {
  if (error.status === 422) void qc.invalidateQueries({ queryKey: ['mentorDefaults'] });
}

export function useSetLive(onFailed: (id: string, live: boolean) => void) {
  const failed = useLatest(onFailed);
  const qc = useQueryClient();
  const who = useWho();
  const key = keys.sessionTypes.own(who);
  const mutation = useMutation({
    ...rowWrite(qc),
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
      const wasFeatured = !!qc
        .getQueryData<OwnSessionType[]>(key)
        ?.find((t) => t.id === id && t.isFeatured);
      // Hiding un-features it (the server does too): the badge goes at once.
      qc.setQueryData<OwnSessionType[]>(key, (list) =>
        list?.map((t) =>
          t.id === id ? { ...t, isLive: live, isFeatured: live && t.isFeatured } : t,
        ),
      );
      return { wasFeatured };
    },
    onError: (_e, { id, live }, ctx) => {
      // Roll back this row only: another row's switch may be in flight too.
      qc.setQueryData<OwnSessionType[]>(key, (list) =>
        list?.map((t) =>
          t.id === id ? { ...t, isLive: !live, isFeatured: ctx?.wasFeatured ?? t.isFeatured } : t,
        ),
      );
      failed.current(id, live);
    },
  });
  return (id: string, live: boolean) => mutation.mutate({ id, live });
}

/**
 * DELETE /me/session-types/{id}, after the confirm. 204: gone. 202: sessions
 * are booked on it, so it's hidden now (and un-featured) and deleted after the
 * last one; the row shows that until then (backend round 4).
 */
export function useDeleteSessionType() {
  const qc = useQueryClient();
  const who = useWho();
  const mutation = useMutation<DeleteResult, DeleteError, string>({
    ...rowWrite(qc),
    mutationFn: async (id) => {
      let result;
      try {
        result = await api.DELETE('/api/v1/me/session-types/{session_type_id}', {
          params: { path: { session_type_id: id } },
        });
      } catch (e) {
        // Network failure: our copy, never the browser's "Failed to fetch".
        throw deleteError(e);
      }
      const { data, error, response } = result;
      // Already gone (deleted from another tab or device): what the mentor wanted.
      if (response.status === 404 || response.status === 204) return { kind: 'deleted' };
      // Scheduled even when the body didn't arrive: the refetch brings the figures.
      if (response.status === 202)
        return {
          kind: 'scheduled',
          deletesAfter: data?.deletes_after ?? null,
          bookedCount: data?.booked_count ?? 0,
        };
      throw deleteError(apiError(response.status, error));
    },
    // A list fetch already under way would land after this and bring the row back.
    onMutate: () => qc.cancelQueries({ queryKey: keys.sessionTypes.own(who) }),
    onSuccess: (r, id) => {
      qc.setQueryData<OwnSessionType[]>(keys.sessionTypes.own(who), (list) =>
        r.kind === 'deleted'
          ? list?.filter((t) => t.id !== id)
          : list?.map((t) =>
              t.id === id
                ? {
                    ...t,
                    isLive: false,
                    isFeatured: false,
                    pendingDeletion: { deletesAfter: r.deletesAfter, bookedCount: r.bookedCount },
                  }
                : t,
            ),
      );
    },
  });
  return {
    remove: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * POST …/restore: the scheduled deletion is cancelled; the type stays hidden.
 * A 404 means the hourly job already deleted it: the row goes, like a delete.
 */
export function useRestoreSessionType(
  onFailed: (id: string, error: AppError) => void,
  onDone: (id: string, result: 'kept' | 'gone') => void,
) {
  const cb = useLatest({ onFailed, onDone });
  const qc = useQueryClient();
  const who = useWho();
  const key = keys.sessionTypes.own(who);
  const mutation = useMutation<'kept' | 'gone', AppError, string>({
    ...rowWrite(qc, RESTORE),
    mutationFn: async (id) => {
      const r = await api
        .POST('/api/v1/me/session-types/{session_type_id}/restore', {
          params: { path: { session_type_id: id } },
        })
        .catch((e: unknown) => {
          throw normaliseError(e);
        });
      if (r.response.status === 404) return 'gone';
      if (!r.response.ok) throw normaliseError(apiError(r.response.status, r.error));
      return 'kept';
    },
    onMutate: () => qc.cancelQueries({ queryKey: key }),
    onSuccess: (r, id) => {
      qc.setQueryData<OwnSessionType[]>(key, (list) =>
        r === 'gone'
          ? list?.filter((t) => t.id !== id)
          : list?.map((t) => (t.id === id ? { ...t, pendingDeletion: null, isLive: false } : t)),
      );
      cb.current.onDone(id, r);
    },
    onError: (e, id) => cb.current.onFailed(id, e),
  });
  // useMutation tracks only its latest call: read every restore still pending.
  const pendingIds = useMutationState({
    filters: { mutationKey: RESTORE, status: 'pending' },
    // RESTORE is this hook's alone, so its variables are always the row id.
    select: (m) => m.state.variables as string,
  });
  return { restore: mutation.mutate, pendingIds };
}

/**
 * PATCH is_featured — optimistic: the badge moves at once (featuring one
 * un-features the others, as the backend does in one transaction) and rolls
 * back if refused (a hidden or scheduled type: 422 /is_featured).
 */
export function useSetFeatured(onFailed: (id: string, featured: boolean, error: AppError) => void) {
  const failed = useLatest(onFailed);
  const qc = useQueryClient();
  const who = useWho();
  const key = keys.sessionTypes.own(who);
  const mutation = useMutation({
    ...rowWrite(qc),
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { data, error, response } = await api.PATCH(
        '/api/v1/me/session-types/{session_type_id}',
        { params: { path: { session_type_id: id } }, body: { is_featured: featured } },
      );
      if (!data) throw apiError(response.status, error);
    },
    onMutate: async ({ id, featured }) => {
      await qc.cancelQueries({ queryKey: key });
      // Only the badges roll back: another row's switch may have saved meanwhile.
      const wasFeatured = (qc.getQueryData<OwnSessionType[]>(key) ?? [])
        .filter((t) => t.isFeatured)
        .map((t) => t.id);
      qc.setQueryData<OwnSessionType[]>(key, (list) =>
        list?.map((t) => ({
          ...t,
          isFeatured: t.id === id ? featured : featured ? false : t.isFeatured,
        })),
      );
      return { wasFeatured };
    },
    onError: (e, { id, featured }, ctx) => {
      // Back to the badges before this call; another feature still in flight
      // shows again when it settles and the list refetches.
      if (ctx)
        qc.setQueryData<OwnSessionType[]>(key, (list) =>
          list?.map((t) => ({ ...t, isFeatured: ctx.wasFeatured.includes(t.id) })),
        );
      failed.current(id, featured, normaliseError(e));
    },
  });
  return (id: string, featured: boolean) => mutation.mutate({ id, featured });
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
export function createError(
  error: unknown,
  body: unknown,
  action: 'publish' | 'save' | 'duplicate' = 'publish',
): CreateError {
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
  return {
    ...e,
    fields,
    message:
      action === 'save'
        ? `We couldn’t save your changes. ${e.message} Try again.`
        : action === 'duplicate'
          ? // Copy confirmed by design (reply 2026-09-29, #9).
            `We couldn’t duplicate it. ${e.message} Try again.`
          : `We couldn’t publish it. ${e.message} Try again.`,
  };
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
    onError: (e) => refreshLimitsOnRefusal(qc, e),
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
export function useMentorDefaults(
  userId: string | null,
): Remote<MentorDefaults> & { refreshing: boolean } {
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
        // Shown within the current cap: a default saved above a cap lowered since.
        windowDays:
          data.booking_window_days == null
            ? null
            : Math.min(data.booking_window_days, data.max_booking_window_days),
        breakMin: data.break_after_minutes ?? null,
        requiresApproval: data.requires_booking_confirmation,
        maxWindowDays: data.max_booking_window_days,
        platformWindowDays: data.default_booking_window_days,
      };
    },
    // Read fresh each time a form opens: the platform cap in it is a setting
    // that can change, and a stale one would offer windows the backend refuses.
    staleTime: 0,
  });
  // Only what was read while this form is open: a cached copy can carry a cap
  // since lowered, and the form would offer windows the backend refuses.
  const fresh = query.isFetchedAfterMount;
  return {
    data: fresh ? (query.data ?? null) : null,
    isLoading: userId !== null && !fresh && !query.isError,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
    refreshing: query.isFetching,
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
        default_min_notice_minutes: Math.round(r.noticeHours * 60),
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
    onError: (e) => refreshLimitsOnRefusal(qc, e),
    onSuccess: (saved) => {
      // The platform's cap and default aren't the mentor's to save: keep them.
      qc.setQueryData<MentorDefaults>(defaultsKey(userId), (before) => ({
        ...saved,
        maxWindowDays: before?.maxWindowDays,
        platformWindowDays: before?.platformWindowDays,
      }));
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

/** Our copy for a failed save (confirmed by design, reply 2026-09-29, #7); never the server's. */
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
