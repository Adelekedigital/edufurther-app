'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { Remote } from '@/types/mentor';
import {
  emptyWeek,
  hhmm,
  resolveDefaults,
  type BookingDefaults,
  type DayHours,
  type Draft,
  type DraftQuestion,
  type Stage,
} from '@/lib/utils/sessionTypeDraft';
import { planQuestions, toPatchBody, type SavedQuestion } from '@/lib/utils/sessionTypeEdit';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { createError, type CreateError } from './sessionTypes';
import { planHoursSave, toWeeklyHours } from './weeklyHours';

type OwnSessionTypeRead = components['schemas']['OwnSessionTypeRead'];
type QuestionRead = components['schemas']['QuestionRead'];
type AvailabilityRuleRead = components['schemas']['AvailabilityRuleRead'];

/** Everything the edit form starts from, as saved. */
export type SavedSessionType = {
  read: OwnSessionTypeRead;
  questions: SavedQuestion[];
  /** Its dedicated hours (none: it books into the mentor's Calendar hours). */
  windows: AvailabilityRuleRead[];
};

export function toSavedQuestion(q: QuestionRead): SavedQuestion {
  return {
    id: q.id,
    text: q.question_text,
    kind:
      q.question_type === 'multi_choice'
        ? q.allows_multiple
          ? 'multi'
          : 'single'
        : (q.question_type as 'free_text' | 'file_upload'),
    required: q.is_required,
    options: (q.options ?? []).map((o) => ({ id: o.id, text: o.text })),
  };
}

/**
 * The draft a saved type opens as. "Use my defaults" when it inherits every
 * rule (length, notice, window, break, approval); otherwise its own rules, the
 * inherited ones shown at the mentor's current values (they're only sent if
 * changed). "Set dedicated hours" when it has any.
 */
export function toDraft(s: SavedSessionType, defaults: BookingDefaults | null): Draft {
  const r = s.read;
  const mine = defaults ? resolveDefaults(defaults) : null;
  const inheritsAll =
    r.duration_inherited &&
    r.min_notice_inherited &&
    r.booking_window_days == null &&
    r.break_after_minutes == null &&
    r.requires_booking_confirmation == null;
  const offerings = r.service_offerings?.length
    ? r.service_offerings
    : r.service_offering
      ? [r.service_offering]
      : [];
  const hours = toWeeklyHours(s.windows, 'UTC');
  return {
    name: r.name,
    description: r.description ?? '',
    topics: offerings.map((o) => o.code),
    stages: (r.application_stages ?? (r.application_stage ? [r.application_stage] : [])) as Stage[],
    customStage: r.custom_stage_label ?? '',
    icon: r.icon ?? null,
    questions: s.questions.map((q): DraftQuestion => ({
      key: q.id,
      id: q.id,
      text: q.text,
      kind: q.kind,
      required: q.required,
      options: q.options.map((o) => o.text),
    })),
    durationMin: r.duration_minutes,
    noticeHours: r.min_notice_minutes / 60,
    rules: inheritsAll ? 'default' : 'custom',
    windowDays: r.booking_window_days ?? mine?.windowDays ?? 28,
    breakMin: r.break_after_minutes ?? mine?.breakMin ?? 15,
    hours: s.windows.some((w) => w.is_active) ? 'custom' : 'default',
    days: s.windows.length ? hours.days : emptyWeek(),
    approval:
      r.requires_booking_confirmation == null
        ? 'inherit'
        : r.requires_booking_confirmation
          ? 'on'
          : 'off',
  };
}

/** GET the type (from the own list: there's no single GET), its questions and its hours. */
export function useSavedSessionType(id: string, enabled: boolean): Remote<SavedSessionType> {
  const query = useQuery({
    queryKey: keys.sessionTypes.edit(id),
    enabled,
    queryFn: async ({ signal }): Promise<SavedSessionType> => {
      const path = { params: { path: { session_type_id: id } }, signal };
      const list = await api.GET('/api/v1/me/session-types', { signal });
      if (!list.data) throw apiError(list.response.status, list.error);
      const read = list.data.data.find((t) => t.id === id);
      // Not theirs, or deleted: indistinguishable on purpose (and nothing more is asked).
      if (!read) throw new ApiError(404);
      const [qs, ws] = await Promise.all([
        api.GET('/api/v1/me/session-types/{session_type_id}/questions', path),
        api.GET('/api/v1/me/session-types/{session_type_id}/windows', path),
      ]);
      if (!qs.data) throw apiError(qs.response.status, qs.error);
      if (!ws.data) throw apiError(ws.response.status, ws.error);
      return {
        read,
        questions: [...qs.data.data]
          .sort((a, b) => a.display_order - b.display_order)
          .map(toSavedQuestion),
        windows: ws.data.data,
      };
    },
    // The form keeps its own copy; a background refetch mustn't move it.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && enabled,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/** What didn't save, when the type's own fields did. */
export type SaveResult = { failed: ('questions' | 'hours')[] };

type SaveVars = {
  id: string;
  draft: Draft;
  /** The draft as saved (the diff's other side). */
  saved: Draft;
  savedQuestions: SavedQuestion[];
  savedWindows: AvailabilityRuleRead[];
  offeringIds: Record<string, string>;
  timeZone: string;
};

const ok = (p: Promise<{ response: Response }>) => p.then((r) => r.response.ok).catch(() => false);

/**
 * Save an edit. The type's own fields first, in one PATCH: if that's refused,
 * nothing else is sent and the refusal maps to the fields (as on create). Then
 * the questions and the dedicated hours, each diffed; what didn't save comes
 * back so the page can say so and Save can retry (it re-reads, then diffs
 * again, so only what's still different is sent).
 */
export function useSaveSessionType() {
  const qc = useQueryClient();
  const mutation = useMutation<SaveResult, CreateError, SaveVars>({
    mutationFn: async (v) => {
      const session_type_id = v.id;
      const patch = toPatchBody(v.draft, v.saved, v.offeringIds);
      if (Object.keys(patch).length) {
        let result;
        try {
          result = await api.PATCH('/api/v1/me/session-types/{session_type_id}', {
            params: { path: { session_type_id } },
            body: patch as components['schemas']['MentorSessionTypePatch'],
          });
        } catch (e) {
          throw createError(e, null, 'save');
        }
        if (!result.response.ok)
          throw createError(apiError(result.response.status, result.error), result.error, 'save');
      }
      const failed: SaveResult['failed'] = [];

      // Questions: removed, changed, added, then the order.
      const plan = planQuestions(v.draft.questions, v.savedQuestions);
      const qp = (question_id: string) => ({ params: { path: { session_type_id, question_id } } });
      const results: boolean[] = [];
      results.push(
        ...(await Promise.all(
          plan.remove.map((qid) =>
            api
              .DELETE('/api/v1/me/session-types/{session_type_id}/questions/{question_id}', qp(qid))
              .then((r) => r.response.ok || r.response.status === 404)
              .catch(() => false),
          ),
        )),
        ...(await Promise.all(
          plan.update.map((u) =>
            ok(
              api.PATCH('/api/v1/me/session-types/{session_type_id}/questions/{question_id}', {
                ...qp(u.id),
                body: u.body,
              }),
            ),
          ),
        )),
      );
      const newIds: Record<string, string> = {};
      for (const a of plan.add) {
        const r = await api
          .POST('/api/v1/me/session-types/{session_type_id}/questions', {
            params: { path: { session_type_id } },
            // The generated type makes defaulted fields required (openapi-typescript).
            body: a.body as components['schemas']['QuestionWrite'],
          })
          .catch(() => null);
        const newId = r?.data && (r.data as Record<string, string>).id;
        if (newId) newIds[a.key] = newId;
        results.push(!!newId);
      }
      const allIds = v.draft.questions.map((q) => q.id ?? newIds[q.key]);
      if (plan.reorder && allIds.every(Boolean) && allIds.length)
        results.push(
          await ok(
            api.PUT('/api/v1/me/session-types/{session_type_id}/questions/order', {
              params: { path: { session_type_id } },
              body: { question_ids: allIds as string[] },
            }),
          ),
        );
      if (results.some((x) => !x)) failed.push('questions');

      // Dedicated hours: "Use my Calendar availability" is having none.
      const days: DayHours[] = v.draft.hours === 'custom' ? v.draft.days : emptyWeek();
      const hp = planHoursSave(
        v.savedWindows.filter((w) => w.is_active),
        days,
      );
      const hourResults = await Promise.all([
        ...hp.remove.map((w) =>
          api
            .DELETE('/api/v1/me/session-types/{session_type_id}/windows/{window_id}', {
              params: { path: { session_type_id, window_id: w.id } },
            })
            .then((r) => r.response.ok || r.response.status === 404)
            .catch(() => false),
        ),
      ]);
      for (const a of hp.add)
        hourResults.push(
          await ok(
            api.POST('/api/v1/me/session-types/{session_type_id}/windows', {
              params: { path: { session_type_id } },
              body: {
                day_of_week: a.day,
                start_time: hhmm(a.slot[0]),
                end_time: hhmm(a.slot[1]),
                timezone: v.savedWindows[0]?.timezone ?? v.timeZone,
                is_active: true,
              },
            }),
          ),
        );
      if (hourResults.some((x) => !x)) failed.push('hours');
      return { failed };
    },
    onSettled: (_r, _e, v) => {
      void qc.invalidateQueries({ queryKey: keys.sessionTypes.all });
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
      void qc.invalidateQueries({ queryKey: ['booking'] });
      void qc.invalidateQueries({ queryKey: keys.sessionTypes.edit(v.id) });
    },
  });
  return {
    save: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
