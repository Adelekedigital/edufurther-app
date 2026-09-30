import { useRef, useState } from 'react';
import type { AppError, IntakeAnswer, IntakeFile, IntakeQuestion } from '@/types/mentor';

export type Upload = { status: 'uploading' | 'error'; file: File; error?: string };

/** Answered = something to send: text, at least one option, or an uploaded file. */
export function isAnswered(a: IntakeAnswer | undefined): boolean {
  return !!(a?.text?.trim() || a?.optionIds?.length || a?.file);
}

/**
 * The intake answers, and file answers in flight or refused (by question id; a
 * done one is in `answers`).
 */
export function useIntakeAnswers(
  onUpload: ((file: File) => Promise<IntakeFile>) | undefined,
  requestError: { questionId?: string; fileGone?: boolean } | null,
) {
  const [answers, setAnswers] = useState<Record<string, IntakeAnswer>>({});
  const [uploads, setUploads] = useState<Record<string, Upload>>({});
  const answer = (id: string, a: IntakeAnswer) => setAnswers((x) => ({ ...x, [id]: a }));
  // The upload each question is waiting for. A result that isn't the latest for
  // its question (another file picked, or the session type changed) is dropped
  // (review of #62: a late upload answered a question no longer on screen).
  const uploadGen = useRef(0);
  const latestUpload = useRef<Record<string, number>>({});
  const upload = (q: IntakeQuestion, file: File | null) => {
    if (!file) return;
    if (!onUpload) return;
    const token = ++uploadGen.current;
    latestUpload.current[q.id] = token;
    const current = () => latestUpload.current[q.id] === token;
    setAnswers(({ [q.id]: _replaced, ...rest }) => rest);
    setUploads((u) => ({ ...u, [q.id]: { status: 'uploading', file } }));
    onUpload(file).then(
      (f) => {
        if (!current()) return;
        answer(q.id, { file: f });
        setUploads(({ [q.id]: _done, ...rest }) => rest);
      },
      (e: AppError) =>
        current() &&
        setUploads((u) => ({
          ...u,
          [q.id]: {
            status: 'error',
            file,
            error: e?.message ?? 'We couldn’t upload it. Try again.',
          },
        })),
    );
  };
  // A file the server can't use any more (already used, or deleted after a
  // day): drop it once per refusal, so the field asks for it again.
  const [seenError, setSeenError] = useState(requestError);
  if (requestError !== seenError) {
    setSeenError(requestError);
    const gone = requestError?.fileGone ? requestError.questionId : undefined;
    if (gone) setAnswers(({ [gone]: _gone, ...rest }) => rest);
  }
  /** Another session type: its questions start empty, and late uploads are dropped. */
  const reset = () => {
    setAnswers({});
    latestUpload.current = {};
    setUploads({});
  };
  return { answers, uploads, answer, upload, reset };
}
