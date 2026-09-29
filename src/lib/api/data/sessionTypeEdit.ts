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
import { deviceTimeZone } from '@/lib/utils/format';
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
  const hours = toWeeklyHours(s.windows, deviceTimeZone());
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
    hours: hours.rules.length ? 'custom' : 'default',
    days: hours.rules.length ? hours.days : emptyWeek(),
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
/**
 * What the save did. `saved` is the type as it now is on the server, built from
 * each request's own outcome (not a re-read, which may not land): the next Save
 * diffs against it, so a retry sends only what's left (review of #67).
 */
export type SaveResult = {
  failed: ('questions' | 'hours')[];
  /** New questions' ids, by their draft key: the form writes them into the draft. */
  newIds: Record<string, string>;
  /** Per draft question key: our copy for a change the server refused (an answered option). */
  questionErrors: Record<string, string>;
  saved: { questions: SavedQuestion[]; windows: AvailabilityRuleRead[] };
};

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

/** A saved question as the draft now has it (after a successful write). */
function fromDraft(q: DraftQuestion, before: SavedQuestion): Omit<SavedQuestion, 'id'> {
  const choice = q.kind === 'single' || q.kind === 'multi';
  const texts = choice ? q.options.map((o) => o.trim()).filter(Boolean) : [];
  return {
    text: q.text.trim(),
    kind: q.kind,
    required: q.required,
    // Ids we can't know until re-read stay as the old ones where the text matched.
    options: texts.map((text, i) => ({
      id:
        before.options.find((o) => o.text === text)?.id ?? before.options[i]?.id ?? `pending-${i}`,
      text,
    })),
  };
}

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
      const questionErrors: SaveResult['questionErrors'] = {};

      // ---- questions: removed, changed, added, then the order -----------------
      const plan = planQuestions(v.draft.questions, v.savedQuestions);
      const qp = (question_id: string) => ({ params: { path: { session_type_id, question_id } } });
      let questions = [...v.savedQuestions];
      let questionsOk = true;
      await Promise.all(
        plan.remove.map(async (qid) => {
          const r = await api
            .DELETE('/api/v1/me/session-types/{session_type_id}/questions/{question_id}', qp(qid))
            .catch(() => null);
          if (r && (r.response.ok || r.response.status === 404))
            questions = questions.filter((q) => q.id !== qid);
          else questionsOk = false;
        }),
      );
      await Promise.all(
        plan.update.map(async (u) => {
          const r = await api
            .PATCH('/api/v1/me/session-types/{session_type_id}/questions/{question_id}', {
              ...qp(u.id),
              body: u.body,
            })
            .catch(() => null);
          const dq = v.draft.questions.find((q) => q.id === u.id)!;
          if (r?.response.ok) {
            questions = questions.map((q) => (q.id === u.id ? { ...q, ...fromDraft(dq, q) } : q));
          } else {
            questionsOk = false;
            // A booking answer chose an option this change removes (backend: 409).
            if (r?.response.status === 409)
              questionErrors[dq.key] =
                'A booking already chose an option you removed or changed. Keep it, then save again.';
          }
        }),
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
        if (newId) {
          newIds[a.key] = newId;
          const dq = v.draft.questions.find((q) => q.key === a.key)!;
          questions.push({
            id: newId,
            ...fromDraft(dq, { id: newId, text: '', kind: dq.kind, required: false, options: [] }),
          });
        } else questionsOk = false;
      }
      // The order: every question that exists now, in the draft's order.
      const allIds = v.draft.questions.map((q) => q.id ?? newIds[q.key]);
      if (plan.reorder && questionsOk && allIds.every(Boolean) && allIds.length) {
        const done = await ok(
          api.PUT('/api/v1/me/session-types/{session_type_id}/questions/order', {
            params: { path: { session_type_id } },
            body: { question_ids: allIds as string[] },
          }),
        );
        if (done) questions = allIds.map((qid) => questions.find((q) => q.id === qid)!);
        else questionsOk = false;
      }
      if (!questionsOk) failed.push('questions');

      // ---- dedicated hours: "Use my Calendar availability" is having none -------
      // Only this zone's active hours are shown, diffed and added to; hours kept in
      // another zone are left as they are (review of #67).
      const zone = toWeeklyHours(v.savedWindows, v.timeZone);
      const days: DayHours[] = v.draft.hours === 'custom' ? v.draft.days : emptyWeek();
      const hp = planHoursSave(zone.rules, days);
      let windows = [...v.savedWindows];
      let hoursOk = true;
      await Promise.all(
        hp.remove.map(async (w) => {
          const r = await api
            .DELETE('/api/v1/me/session-types/{session_type_id}/windows/{window_id}', {
              params: { path: { session_type_id, window_id: w.id } },
            })
            .catch(() => null);
          if (r && (r.response.ok || r.response.status === 404))
            windows = windows.filter((x) => x.id !== w.id);
          else hoursOk = false;
        }),
      );
      for (const a of hp.add) {
        const body = {
          day_of_week: a.day,
          start_time: hhmm(a.slot[0]),
          end_time: hhmm(a.slot[1]),
          timezone: zone.timeZone,
          is_active: true,
        };
        const r = await api
          .POST('/api/v1/me/session-types/{session_type_id}/windows', {
            params: { path: { session_type_id } },
            body,
          })
          .catch(() => null);
        const wid = r?.data && (r.data as Record<string, string>).id;
        if (r?.response.ok && wid) windows.push({ id: wid, ...body });
        else hoursOk = false;
      }
      if (!hoursOk) failed.push('hours');
      return { failed, newIds, questionErrors, saved: { questions, windows } };
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
