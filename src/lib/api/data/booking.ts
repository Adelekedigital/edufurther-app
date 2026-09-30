'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { DEFAULT_HORIZON_DAYS, slotWindow } from '@/lib/utils/slots';
import type {
  AppError,
  BookingRequest,
  IntakeAnswer,
  IntakeFile,
  IntakeQuestion,
  Remote,
  SessionType,
} from '@/types/mentor';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

type SessionTypeRead = components['schemas']['SessionTypeRead'];
type QuestionRead = components['schemas']['QuestionRead'];
type AnswerWrite = components['schemas']['AnswerWrite'];

// ---- mapping ----------------------------------------------------------------

export function toQuestion(q: QuestionRead): IntakeQuestion {
  return {
    id: q.id,
    label: q.question_text,
    kind:
      q.question_type === 'file_upload'
        ? 'file'
        : q.question_type === 'multi_choice'
          ? q.allows_multiple
            ? 'multi'
            : 'single'
          : 'text',
    required: q.is_required,
    options: (q.options ?? []).map((o) => ({ id: o.id, label: o.text })),
  };
}

export function toSessionType(r: SessionTypeRead): SessionType {
  return {
    id: r.id,
    name: r.name,
    durationMin: r.duration_minutes,
    description: r.description?.trim() ?? '',
    // The window this type really uses (the platform cap applied), backend #309.
    windowDays: r.booking_window_days,
    // The live intake form, in the order mentees see it (backend #268).
    questions: [...(r.questions ?? [])]
      .sort((a, b) => a.display_order - b.display_order)
      .map(toQuestion),
  };
}

/** Answered = something to send: text, at least one option, or an uploaded file. */
export function isAnswered(a: IntakeAnswer | undefined): boolean {
  return !!(a?.text?.trim() || a?.optionIds?.length || a?.file);
}

/** answers[] for POST /sessions: one form per answer, unanswered questions left out. */
export function toAnswers(answers: Record<string, IntakeAnswer>): AnswerWrite[] {
  return Object.entries(answers).flatMap(([question_id, a]): AnswerWrite[] => {
    if (a.file) return [{ question_id, file_id: a.file.id }];
    if (a.optionIds?.length) return [{ question_id, option_ids: a.optionIds }];
    if (a.text?.trim()) return [{ question_id, text: a.text.trim() }];
    return [];
  });
}

/**
 * A refused request. `questionId` when the server named one answer (422
 * /answers/{i}); `fileGone` when that answer's file can't be used any more
 * (already used, or deleted after a day), so the flow drops it.
 */
export type BookingError = AppError & { questionId?: string; fileGone?: boolean };

/** What a 422's pointers say about the answers (backend domain/intake answer_problems). */
export type AnswerProblem =
  | { kind: 'answer'; questionId: string; fileGone: boolean }
  // A required question unanswered, or one we answered that's no longer asked:
  // the questions changed under the modal, so they're re-read.
  | { kind: 'missing' }
  | { kind: 'stale' }
  | null;

export function answerProblem(body: unknown, sent: AnswerWrite[]): AnswerProblem {
  const list = (body as { errors?: unknown } | null)?.errors;
  if (!Array.isArray(list)) return null;
  const pointers = list.map((it) => String((it as { pointer?: unknown })?.pointer ?? ''));
  // "/answers/{i}/question_id": not a question this offering asks (any more).
  if (pointers.some((ptr) => /^\/answers\/\d+\/question_id/.test(ptr))) return { kind: 'stale' };
  for (const ptr of pointers) {
    const m = /^\/answers\/(\d+)(\/file_id)?/.exec(ptr);
    const questionId = m ? sent[Number(m[1])]?.question_id : undefined;
    if (questionId) return { kind: 'answer', questionId, fileGone: !!m?.[2] };
  }
  // "/answers" alone: a required question has no answer.
  return pointers.includes('/answers') ? { kind: 'missing' } : null;
}

/** The answer the server refused, by its pointer into the answers we sent. */
export function questionForPointer(body: unknown, sent: AnswerWrite[]): string | undefined {
  const p = answerProblem(body, sent);
  return p?.kind === 'answer' ? p.questionId : undefined;
}

/**
 * One Idempotency-Key per booking *attempt* (backend ADR 0024): a retry of the
 * same request re-sends the key, so a timeout can't book twice — but a different
 * time or offering is a new attempt with a new key, or the backend answers 422
 * ("this key already stands for a different request").
 */
export function keyForAttempt(
  current: { key: string; body: string } | null,
  body: string,
  newKey: () => string,
): { key: string; body: string } {
  return current && current.body === body ? current : { key: newKey(), body };
}

/** Booking-specific copy over the generic error (never the server's `detail`). */
export function bookingError(e: AppError): AppError {
  switch (e.kind) {
    case 'unauthorized':
      return { ...e, message: 'Log in to book this session.' };
    case 'conflict':
      return { ...e, message: 'That time was just taken. Pick another time.' };
    case 'validation':
      return { ...e, message: 'That time isn’t available any more. Pick another time.' };
    case 'noCredit':
      // PROVISIONAL copy — design request #37.
      return { ...e, message: 'You’re out of credits, so this session can’t be booked yet.' };
    case 'notFound':
      return { ...e, message: 'This session can’t be booked any more.' };
    default:
      return { ...e, message: `We couldn’t send your request. ${e.message} Try again.` };
  }
}

// ---- hooks ------------------------------------------------------------------

/** GET /users/{id}/session-types — what this mentor offers. */
export function useSessionTypes(
  mentorId: string | null,
): Remote<SessionType[]> & { refreshing: boolean; updatedAt: number } {
  const query = useQuery({
    queryKey: keys.booking.sessionTypes(mentorId ?? 'none'),
    enabled: mentorId !== null,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/users/{user_id}/session-types', {
        params: { path: { user_id: mentorId! } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return data.data.map(toSessionType);
    },
    staleTime: 5 * 60 * 1000,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && mentorId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
    refreshing: query.isFetching,
    updatedAt: query.dataUpdatedAt,
  };
}

/**
 * GET /users/{id}/availability/slots for one offering: UTC instants. The UI
 * groups them into days in the viewer's zone (utils/slots.ts).
 */
export function useSlots(
  mentorId: string | null,
  sessionTypeId: string | null,
  /** The viewer's zone: the window is their days (utils/slots.ts slotWindow). */
  timeZone: string,
): Remote<string[]> {
  // The type's own booking window, from the same types query the picker uses
  // (subscribed, so it's never stale): no request until the window is known.
  const qc = useQueryClient();
  const types = useSessionTypes(mentorId);
  // Opening the flow reads the types again: a cached window can be out of
  // date if the platform cap or default changed since (either way).
  const opened = mentorId !== null && sessionTypeId !== null;
  const refreshTypes = types.retry;
  // When the flow opens (or the mentor changes), note when the types were
  // last read; only a read after that sizes the request.
  const openKey = opened ? mentorId : null;
  const [opening, setOpening] = useState({ key: null as string | null, readAt: 0 });
  if (opening.key !== openKey) setOpening({ key: openKey, readAt: types.updatedAt });
  useEffect(() => {
    if (openKey) refreshTypes();
    // Once per opening (or mentor), not on every render's new callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);
  const current =
    openKey !== null &&
    opening.key === openKey &&
    types.updatedAt > opening.readAt &&
    !types.refreshing;
  const horizon =
    types.data && current
      ? (types.data.find((t) => t.id === sessionTypeId)?.windowDays ?? DEFAULT_HORIZON_DAYS)
      : null;
  const enabled = mentorId !== null && sessionTypeId !== null && horizon !== null;
  const window = slotWindow(timeZone, horizon ?? DEFAULT_HORIZON_DAYS);
  const query = useQuery({
    // The window's days are in the key: the grid moves on at midnight, and a
    // different window length never reuses a shorter range.
    queryKey: [
      ...keys.booking.slots(mentorId ?? 'none', sessionTypeId ?? 'none'),
      window.start,
      window.end,
    ],
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET(
        '/api/v1/users/{user_id}/availability/slots',
        {
          params: {
            path: { user_id: mentorId! },
            query: { session_type_id: sessionTypeId!, start: window.start, end: window.end },
          },
          signal,
        },
      );
      if (!data) {
        // A range the backend refuses: its maximum may have been lowered since
        // the types were cached. Reload them; the new window makes a new request.
        if (response.status === 422)
          void qc.invalidateQueries({ queryKey: keys.booking.sessionTypes(mentorId!) });
        throw apiError(response.status, error);
      }
      return data.data.map((s) => s.start);
    },
    // Slots go stale as people book; a minute is short enough and saves a
    // refetch when the type select is toggled back and forth.
    staleTime: 60 * 1000,
  });
  // Until the window is known the grid is loading, never "no open times".
  const waiting = opened && horizon === null && !types.error;
  return {
    data: horizon === null ? null : (query.data ?? null),
    isLoading: waiting || (query.isPending && enabled),
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/** POST /sessions. The mentor follows from the session type. */
export function useRequestBooking() {
  const queryClient = useQueryClient();
  const attempt = useRef<{ key: string; body: string } | null>(null);
  const mutation = useMutation({
    mutationFn: async (req: BookingRequest) => {
      // The intake answers go with the request (backend #268, file answers PR C).
      const answers = toAnswers(req.answers);
      const body = {
        session_type_id: req.sessionTypeId,
        starts_at: req.startsAt,
        ...(answers.length ? { answers } : {}),
      };
      attempt.current = keyForAttempt(attempt.current, JSON.stringify(body), () =>
        crypto.randomUUID(),
      );
      const { data, error, response } = await api.POST('/api/v1/sessions', {
        params: { header: { 'Idempotency-Key': attempt.current.key } },
        body,
      });
      if (!data) {
        const e = apiError(response.status, error) as ApiError & { answers?: AnswerProblem };
        if (response.status === 422) e.answers = answerProblem(error, answers);
        throw e;
      }
      return data;
    },
    onSuccess: () => {
      attempt.current = null;
    },
    onSettled: (_data, error, req) => {
      // The questions changed under the modal (a required one we didn't show, or
      // one we answered that's gone): re-read them.
      const problem = (error as { answers?: AnswerProblem } | null)?.answers?.kind;
      if (problem === 'missing' || problem === 'stale')
        void queryClient.invalidateQueries({
          queryKey: keys.booking.sessionTypes(req.mentorId),
        });
      // A booking (or a slot taken meanwhile) changes this mentor's grid and
      // their "next available" on the cards.
      void queryClient.invalidateQueries({ queryKey: keys.booking.slotsFor(req.mentorId) });
      void queryClient.invalidateQueries({ queryKey: keys.mentors.all });
    },
  });
  const error = useMemo(
    () => (mutation.error ? requestError(mutation.error) : null),
    [mutation.error],
  );
  return {
    request: mutation.mutate,
    isPending: mutation.isPending,
    isDone: mutation.isSuccess,
    // One object per error: the flow reacts to a new refusal by identity (review r2 of #62).
    error,
    reset: () => {
      attempt.current = null;
      mutation.reset();
    },
  };
}

/** Our copy for a refused request; an answer the server refused points at its question. */
export function requestError(e: unknown): BookingError {
  const problem = (e as { answers?: AnswerProblem }).answers ?? null;
  if (problem?.kind === 'answer')
    return {
      ...normaliseError(e),
      questionId: problem.questionId,
      ...(problem.fileGone
        ? {
            fileGone: true,
            message: 'Upload the file again: that one can’t be used any more.',
          }
        : { message: 'Check your answer to this question, then send again.' }),
    };
  if (problem?.kind === 'missing')
    // Copy confirmed by design (reply 2026-09-29, #6).
    return {
      ...normaliseError(e),
      message: 'Answer every required question (marked *), then send again.',
    };
  if (problem?.kind === 'stale')
    // Copy confirmed by design (reply 2026-09-29, #6).
    return {
      ...normaliseError(e),
      message: 'The questions for this session changed. Check your answers, then send again.',
    };
  return bookingError(normaliseError(e));
}

// ---- intake files (backend PR C) -----------------------------------------------

/** What the upload endpoint takes (decided from the bytes, not the name). */
export const INTAKE_ACCEPT = '.pdf,.docx';
export const INTAKE_MAX_BYTES = 5 * 1024 * 1024;

/** Our copy for a refused upload, by status; the server's text is never shown. */
export function uploadError(e: unknown): AppError {
  const n = normaliseError(e);
  const s = e instanceof ApiError ? e.status : undefined;
  if (s === 413 || s === 422)
    return { ...n, message: 'Upload a PDF or Word (.docx) file under 5 MB.' };
  if (s === 409)
    return {
      ...n,
      message: 'You have too many files waiting to be used in a booking. Try again tomorrow.',
    };
  if (s === 401) return { ...n, message: 'Log in to upload a file.' };
  if (s !== undefined && s >= 500)
    return { ...n, message: 'File uploads aren’t available right now. Try again later.' };
  return { ...n, message: `We couldn’t upload it. ${n.message} Try again.` };
}

/**
 * POST /me/intake-files: upload when the mentee picks the file (an unused
 * upload is deleted after about a day), then answer with its id. A file that
 * is obviously wrong (size) is refused here, before it's sent.
 */
export function useUploadIntakeFile() {
  const mutation = useMutation<IntakeFile, AppError, File>({
    mutationFn: async (file) => {
      if (file.size > INTAKE_MAX_BYTES) throw uploadError(new ApiError(413));
      let result;
      try {
        result = await api.POST('/api/v1/me/intake-files', {
          // The generated type calls the binary part a string (openapi-typescript
          // and multipart); the serializer sends the File itself.
          body: { file } as unknown as { file: string },
          bodySerializer: (b) => {
            const form = new FormData();
            form.append('file', (b as unknown as { file: File }).file);
            return form;
          },
        });
      } catch (e) {
        throw uploadError(e);
      }
      const { data, error, response } = result;
      if (!data) throw uploadError(apiError(response.status, error));
      return { id: data.file_id, name: data.filename, size: data.size };
    },
  });
  return (file: File) => mutation.mutateAsync(file);
}
