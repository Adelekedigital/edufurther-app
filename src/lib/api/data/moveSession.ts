'use client';

import { useCallback, useRef, useState } from 'react';
import type { components } from '@/lib/api/generated/schema';
import type { Booking } from '@/types/booking';
import type { AppError, IntakeAnswer, IntakeQuestion, SessionType } from '@/types/mentor';
import { requestError, uploadIntakeFile, useRequestBooking } from './booking';
import { useBookingAction } from './bookingActions';
import { apiError, normaliseError } from './errors';
import { api } from './http';

type SessionAnswerRead = components['schemas']['SessionAnswerRead'];

/**
 * Why the move stopped **before** the cancel, so nothing has changed:
 *  - `failed`: the old answers or a file couldn't be read;
 *  - `upload`: a file couldn't be uploaded again (`error.message` says why:
 *    too many waiting, ten an hour, …);
 *  - `questionsChanged`: the session's questions changed since it was booked,
 *    so the old answers can't book it again (a required one has no answer).
 * Or `cancel`: the cancel itself was refused (`error.message`, as built).
 */
export type MoveError =
  | { stage: 'prepare'; reason: 'failed' | 'upload' | 'questionsChanged'; error: AppError }
  | { stage: 'cancel'; error: AppError };

export type MoveRequest = {
  /** The confirmed session being moved; the viewer is its mentee. */
  booking: Booking;
  /** Its session type as the mentor offers it now: the new booking's form. */
  sessionType: SessionType;
  /** The new time: an instant `/slots` lists for this mentor and type. */
  startsAt: string;
  /** "Message to {First}": the cancel's `reason_text`. */
  message: string;
};

export type MoveCallbacks = {
  /** Booked: the new session's id. */
  onMoved: (newId: string) => void;
  /** The old session is canceled and the new time isn't booked. */
  onBookFailed: (error: AppError) => void;
};

class PrepareError extends Error {
  constructor(
    readonly reason: 'failed' | 'upload' | 'questionsChanged',
    readonly appError: AppError,
  ) {
    super(reason);
  }
}

/**
 * The old answers, fitted to the form as it stands now. One answer per live
 * question, in the form the question takes today; answers to questions no
 * longer asked are left out (the server would refuse them, after the cancel).
 * `file` entries are the old files, still to be uploaded again.
 */
export function carryAnswers(
  old: SessionAnswerRead[],
  questions: IntakeQuestion[],
): {
  answers: Record<string, IntakeAnswer>;
  files: Record<string, AnsweredFile>;
  missing: boolean;
} {
  const answers: Record<string, IntakeAnswer> = {};
  const files: Record<string, AnsweredFile> = {};
  let missing = false;
  for (const q of questions) {
    const a = old.find((x) => x.question_id === q.id && x.answered && !x.retired);
    let carried = false;
    if (a && q.kind === 'text' && a.question_type === 'free_text' && a.text?.trim()) {
      answers[q.id] = { text: a.text.trim() };
      carried = true;
    } else if (
      a &&
      (q.kind === 'single' || q.kind === 'multi') &&
      a.question_type === 'multi_choice'
    ) {
      // Only options the question still has.
      const ids = (a.options ?? [])
        .map((o) => o.id)
        .filter((id) => q.options.some((o) => o.id === id));
      if (ids.length && (q.kind === 'multi' || ids.length === 1)) {
        answers[q.id] = { optionIds: ids };
        carried = true;
      }
    } else if (a && q.kind === 'file' && a.question_type === 'file_upload' && a.file?.available) {
      files[q.id] = a.file;
      carried = true;
    }
    if (!carried && q.required) missing = true;
  }
  return { answers, files, missing };
}

type AnsweredFile = NonNullable<SessionAnswerRead['file']>;

/** GET /sessions/{id}/answers, as sent: option ids and file ids intact. */
async function readAnswers(bookingId: string): Promise<SessionAnswerRead[]> {
  let result;
  try {
    result = await api.GET('/api/v1/sessions/{session_id}/answers', {
      params: { path: { session_id: bookingId } },
    });
  } catch (e) {
    throw new PrepareError('failed', normaliseError(e));
  }
  const { data, error, response } = result;
  if (!data) throw new PrepareError('failed', normaliseError(apiError(response.status, error)));
  return data.data;
}

/** The old file's bytes, under its own name and type, ready to upload again. */
async function readFile(file: AnsweredFile): Promise<File> {
  try {
    const { response } = await api.GET('/api/v1/intake-files/{file_id}', {
      params: { path: { file_id: file.id } },
      parseAs: 'stream',
    });
    if (!response.ok) throw apiError(response.status, null);
    return new File([await response.blob()], file.filename, { type: file.content_type });
  } catch (e) {
    throw new PrepareError('failed', normaliseError(e));
  }
}

/**
 * Step 1, before anything changes: the old answers, fitted to today's form,
 * with every file uploaded again (a file linked to one booking can't answer
 * another, `usable_file_ids`). Throws `PrepareError`.
 */
async function prepare(
  bookingId: string,
  questions: IntakeQuestion[],
): Promise<Record<string, IntakeAnswer>> {
  const carried = carryAnswers(await readAnswers(bookingId), questions);
  // Checked before any upload: no files left waiting for a move that can't go.
  if (carried.missing)
    throw new PrepareError('questionsChanged', { kind: 'validation', message: '' });
  const answers = { ...carried.answers };
  // One at a time: the server counts uploads (ten an hour, ten waiting), and a
  // refusal part-way stops the rest.
  for (const [questionId, old] of Object.entries(carried.files)) {
    const bytes = await readFile(old);
    try {
      answers[questionId] = { file: await uploadIntakeFile(bytes) };
    } catch (e) {
      throw new PrepareError('upload', e as AppError);
    }
  }
  return answers;
}

/**
 * The mentee's move (PRD Session Join fixes, fix 1), until the server has one:
 * prepare the answers, cancel the old session (`scheduling_conflict`, the
 * message as `reason_text`), then book the new time with the same session
 * type and answers.
 *
 * Built from the existing writers, so the cancel and the booking keep their
 * own refusal wording, idempotency key and invalidation (Bookings, `/me` with
 * the credits, slots, the room). A failure before the cancel leaves the
 * session as it was and comes back as `error`. A failure after it is
 * `onBookFailed`: the old session is gone, the credit is back (12+ hours out,
 * which is the only time the move is offered), and the page says so.
 */
export function useMoveSession() {
  const cancel = useBookingAction('cancel');
  const book = useRequestBooking();
  const { mutateAsync: cancelAsync } = cancel;
  const { requestAsync } = book;
  // A second press while the first is running is dropped, not queued: two runs
  // would cancel once and book twice.
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MoveError | null>(null);

  const move = useCallback(
    async (req: MoveRequest, cb: MoveCallbacks) => {
      if (running.current) return;
      running.current = true;
      setPending(true);
      setError(null);
      const b = req.booking;
      try {
        let answers: Record<string, IntakeAnswer>;
        try {
          answers = await prepare(b.id, req.sessionType.questions);
        } catch (e) {
          const p = e instanceof PrepareError ? e : new PrepareError('failed', normaliseError(e));
          setError({ stage: 'prepare', reason: p.reason, error: p.appError });
          return;
        }
        try {
          await cancelAsync({
            bookingId: b.id,
            reasonCode: 'scheduling_conflict',
            reasonText: req.message,
          });
        } catch (e) {
          // Already in the cancel's words (`actionError`).
          setError({ stage: 'cancel', error: e as AppError });
          return;
        }
        let created;
        try {
          created = await requestAsync({
            mentorId: b.other.id,
            sessionTypeId: req.sessionType.id,
            startsAt: req.startsAt,
            answers,
          });
        } catch (e) {
          cb.onBookFailed(requestError(e));
          return;
        }
        cb.onMoved(created.id);
      } finally {
        running.current = false;
        setPending(false);
      }
    },
    [cancelAsync, requestAsync],
  );

  return {
    move,
    isPending: pending,
    error,
    reset: useCallback(() => setError(null), []),
  };
}
