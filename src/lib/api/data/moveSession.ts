'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { addDays, dayKey } from '@/lib/utils/slots';
import type { Booking } from '@/types/booking';
import type {
  AppError,
  IntakeAnswer,
  IntakeFile,
  IntakeQuestion,
  SessionType,
} from '@/types/mentor';
import {
  fetchSessionTypes,
  fetchSlotStarts,
  requestError,
  useRequestBooking,
  useUploadIntakeFile,
  type AnswerProblem,
  type BookingError,
} from './booking';
import { useBookingAction } from './bookingActions';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

type SessionAnswerRead = components['schemas']['SessionAnswerRead'];
type AnsweredFile = NonNullable<SessionAnswerRead['file']>;

/**
 * Why the move stopped before the cancel, so nothing has changed. `upload`
 * carries the upload's own words; `sessionChanged`: the type is gone or its
 * approval switched; `answersDropped` is not a refusal: the mentee is told,
 * and pressing again (`acceptDropped`) moves it anyway. `cancel`: the cancel
 * itself was refused, in its words.
 */
export type MoveStopReason =
  | 'failed'
  | 'upload'
  | 'questionsChanged'
  | 'fileUnavailable'
  | 'sessionChanged'
  | 'slotTaken'
  | 'answersDropped';

export type MoveError =
  | { stage: 'prepare'; reason: MoveStopReason; error: AppError }
  | { stage: 'cancel'; error: AppError };

export type MoveRequest = {
  booking: Booking;
  /** As the dialog showed it; read again fresh before the cancel. */
  sessionType: SessionType;
  startsAt: string;
  /** "Message to {First}": the cancel's `reason_text`. */
  message: string;
  /** Told some answers won't carry over, and pressed again. */
  acceptDropped?: boolean;
};

/** Why the booking was refused after the cancel, for the notice. */
export type BookFailure = { why: 'taken' | 'questions' | 'other'; error: BookingError };

export type MoveCallbacks = {
  /** `confirmed` false: the new booking is a request. */
  onMoved: (newId: string, confirmed: boolean) => void;
  onBookFailed: (failure: BookFailure) => void;
};

class Stop extends Error {
  constructor(
    readonly reason: MoveStopReason,
    readonly appError: AppError = { kind: 'validation', message: '' },
  ) {
    super(reason);
  }
}

/** The run was left behind (the page unmounted) before the cancel. */
class Left extends Error {}

/**
 * The old answers fitted to today's form (`files`: old files to upload again).
 * `missing`/`fileMissing`: a required question or file with nothing to carry;
 * `dropped`: answers given that won't all go with the new booking.
 */
export function carryAnswers(
  old: SessionAnswerRead[],
  questions: IntakeQuestion[],
): {
  answers: Record<string, IntakeAnswer>;
  files: Record<string, AnsweredFile>;
  missing: boolean;
  fileMissing: boolean;
  dropped: number;
} {
  const answers: Record<string, IntakeAnswer> = {};
  const files: Record<string, AnsweredFile> = {};
  let missing = false;
  let fileMissing = false;
  let dropped = 0;
  const given = old.filter((a) => a.answered);
  for (const a of given) {
    const q = a.retired ? undefined : questions.find((x) => x.id === a.question_id);
    if (!q) dropped += 1;
  }
  for (const q of questions) {
    const a = given.find((x) => x.question_id === q.id && !x.retired);
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
      const all = (a.options ?? []).map((o) => o.id);
      const ids = all.filter((id) => q.options.some((o) => o.id === id));
      if (ids.length && (q.kind === 'multi' || ids.length === 1)) {
        answers[q.id] = { optionIds: ids };
        carried = true;
        if (ids.length < all.length) dropped += 1;
      }
    } else if (a && q.kind === 'file' && a.question_type === 'file_upload') {
      if (a.file?.available) {
        files[q.id] = a.file;
        carried = true;
      } else if (q.required) fileMissing = true;
    }
    if (a && !carried) dropped += 1;
    if (!carried && q.required && !(a?.question_type === 'file_upload' && q.kind === 'file'))
      missing = true;
  }
  return { answers, files, missing, fileMissing, dropped };
}

/** Turns a failed read into a `failed` stop, and a 404 or 410 into `whenGone`. */
function readStop(e: unknown, whenGone: MoveStopReason = 'failed'): Stop {
  if (e instanceof Stop) return e;
  const status = e instanceof ApiError ? e.status : undefined;
  return new Stop(status === 404 || status === 410 ? whenGone : 'failed', normaliseError(e));
}

/** GET /sessions/{id}/answers, as sent: option ids and file ids intact. */
async function readAnswers(bookingId: string, signal: AbortSignal): Promise<SessionAnswerRead[]> {
  try {
    const { data, error, response } = await api.GET('/api/v1/sessions/{session_id}/answers', {
      params: { path: { session_id: bookingId } },
      signal,
    });
    if (!data) throw apiError(response.status, error);
    return data.data;
  } catch (e) {
    throw readStop(e);
  }
}

/** The old file's bytes, under its own name and type, ready to upload again. */
async function readFile(file: AnsweredFile, signal: AbortSignal): Promise<File> {
  try {
    const { response } = await api.GET('/api/v1/intake-files/{file_id}', {
      params: { path: { file_id: file.id } },
      parseAs: 'stream',
      signal,
    });
    if (!response.ok) throw apiError(response.status, null);
    return new File([await response.blob()], file.filename, { type: file.content_type });
  } catch (e) {
    throw readStop(e, 'fileUnavailable');
  }
}

/** Two days either side of the new time's UTC date: the mentor's zone can't push it out. */
function slotCheckWindow(startsAt: string): { start: string; end: string } {
  const day = dayKey(startsAt, 'UTC');
  return { start: addDays(day, -2), end: addDays(day, 3) };
}

function bookFailure(e: unknown): BookFailure {
  const error = requestError(e);
  const problem = (e as { answers?: AnswerProblem } | null)?.answers;
  if (problem) return { why: 'questions', error };
  if (error.kind === 'conflict' || error.kind === 'validation') return { why: 'taken', error };
  return { why: 'other', error };
}

// ---- a refused booking that outlives the page --------------------------------

/** A booking refused after the cancel, once the page that ran the move had gone. */
export type LeftMoveFailure = BookFailure & { booking: Booking };

let leftFailure: LeftMoveFailure | null = null;
const leftListeners = new Set<() => void>();

/** Kept for Bookings when the move's page had gone (exported for its tests). */
export function rememberMoveFailure(f: LeftMoveFailure | null): void {
  leftFailure = f;
  leftListeners.forEach((l) => l());
}

/** Takes the left-behind failure, once: it is said in one place, one time. */
export function takeMoveFailure(): LeftMoveFailure | null {
  const f = leftFailure;
  if (f) rememberMoveFailure(null);
  return f;
}

/**
 * For Bookings, where the canceled session now is, to say. The app has no
 * shared notice store (every Snackbar is its screen's own), so this is the move's.
 */
export function useLeftMoveFailure(): LeftMoveFailure | null {
  return useSyncExternalStore(
    (l) => {
      leftListeners.add(l);
      return () => void leftListeners.delete(l);
    },
    () => leftFailure,
    () => null,
  );
}

// ---- the hook -----------------------------------------------------------------

/**
 * The mentee's move (PRD Session Join fixes, fix 1), until the server has one.
 * Everything that can stop it is checked before the cancel, so a stop changes
 * nothing: the session type read fresh, the old answers fitted to it with each
 * file uploaded again (`usable_file_ids`), and the time in a fresh `/slots`.
 * Then the existing cancel (`scheduling_conflict`, the message as
 * `reason_text`) and booking writers, with their own wording, idempotency and
 * invalidation. A refusal after the cancel is `onBookFailed` (the credit is
 * back: the move is only offered while cancelling refunds).
 *
 * Left mid-move: before the cancel, nothing happens; after it, no navigation
 * from a page that has gone, and a refusal is kept for Bookings.
 */
export function useMoveSession() {
  const qc = useQueryClient();
  const cancel = useBookingAction('cancel');
  const book = useRequestBooking();
  // The booking form's own upload, with its refusal wording.
  const upload = useUploadIntakeFile();
  const { mutateAsync: cancelAsync } = cancel;
  const { requestAsync } = book;
  // A second press while one runs is dropped: two runs would book twice.
  const running = useRef(false);
  // By old file id: a second attempt reuses them (uploads have no delete).
  const uploaded = useRef(new Map<string, IntakeFile>());
  const alive = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MoveError | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);

  const prepare = useCallback(
    async (req: MoveRequest, signal: AbortSignal): Promise<Record<string, IntakeAnswer>> => {
      const b = req.booking;
      let types: SessionType[];
      try {
        types = await fetchSessionTypes(b.other.id, signal);
      } catch (e) {
        throw readStop(e);
      }
      const type = types.find((t) => t.id === req.sessionType.id);
      if (!type || type.requiresConfirmation !== req.sessionType.requiresConfirmation)
        throw new Stop('sessionChanged');
      const carried = carryAnswers(await readAnswers(b.id, signal), type.questions);
      // Before any upload: no files left waiting for a move that can't go.
      if (carried.fileMissing) throw new Stop('fileUnavailable');
      if (carried.missing) throw new Stop('questionsChanged');
      if (carried.dropped && !req.acceptDropped) throw new Stop('answersDropped');
      const answers = { ...carried.answers };
      // One at a time: the server counts uploads, and a refusal stops the rest.
      for (const [questionId, old] of Object.entries(carried.files)) {
        let file = uploaded.current.get(old.id);
        if (!file) {
          const bytes = await readFile(old, signal);
          try {
            file = await upload(bytes);
          } catch (e) {
            throw new Stop('upload', e as AppError);
          }
          uploaded.current.set(old.id, file);
        }
        answers[questionId] = { file };
      }
      let open: string[];
      try {
        open = await fetchSlotStarts(b.other.id, type.id, slotCheckWindow(req.startsAt), signal);
      } catch (e) {
        throw readStop(e);
      }
      if (!open.some((s) => Date.parse(s) === Date.parse(req.startsAt))) {
        // The picker shows what is open now.
        void qc.invalidateQueries({ queryKey: keys.booking.slotsFor(b.other.id) });
        throw new Stop('slotTaken');
      }
      return answers;
    },
    [qc, upload],
  );

  const move = useCallback(
    async (req: MoveRequest, cb: MoveCallbacks) => {
      if (running.current) return;
      running.current = true;
      const ctrl = new AbortController();
      controller.current = ctrl;
      setPending(true);
      setError(null);
      const b = req.booking;
      try {
        let answers: Record<string, IntakeAnswer>;
        try {
          answers = await prepare(req, ctrl.signal);
          if (ctrl.signal.aborted) throw new Left();
          await cancelAsync({
            bookingId: b.id,
            reasonCode: 'scheduling_conflict',
            reasonText: req.message,
          });
        } catch (e) {
          if (ctrl.signal.aborted || e instanceof Left) return;
          if (e instanceof Stop)
            setError({ stage: 'prepare', reason: e.reason, error: e.appError });
          // Already in the cancel's words (`actionError`).
          else setError({ stage: 'cancel', error: e as AppError });
          return;
        }
        // Canceled: from here the booking runs to the end, page or no page.
        try {
          const created = await requestAsync({
            mentorId: b.other.id,
            sessionTypeId: req.sessionType.id,
            startsAt: req.startsAt,
            answers,
          });
          if (alive.current) cb.onMoved(created.id, created.status === 'confirmed');
        } catch (e) {
          const failure = bookFailure(e);
          if (alive.current) cb.onBookFailed(failure);
          else rememberMoveFailure({ ...failure, booking: b });
        }
      } finally {
        running.current = false;
        if (controller.current === ctrl) controller.current = null;
        setPending(false);
      }
    },
    [prepare, cancelAsync, requestAsync],
  );

  return {
    move,
    isPending: pending,
    error,
    /** The dialog closed: its error and its uploads go. */
    reset: useCallback(() => {
      setError(null);
      uploaded.current.clear();
    }, []),
  };
}
