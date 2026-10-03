'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { BookingAnswer } from '@/types/booking';
import type { Remote } from '@/types/mentor';
import { apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

type SessionAnswerRead = components['schemas']['SessionAnswerRead'];

/**
 * One answer as the panel reads it. The answer is flattened to a single string
 * here, in one place, so the panel and the row preview can never word the same
 * answer differently — a choice list joined, a file named.
 */
export function toAnswer(a: SessionAnswerRead): BookingAnswer {
  const file = a.file ?? null;
  const text =
    a.question_type === 'file_upload'
      ? (file?.filename ?? '')
      : a.question_type === 'multi_choice'
        ? (a.options ?? []).map((o) => o.text).join(', ')
        : (a.text ?? '');
  return {
    questionId: a.question_id,
    // The question's wording **now**, not a copy kept at booking time
    // (backend #350). A reworded question relabels an old answer; nothing the
    // client can do about it, and design knows.
    question: a.question_text,
    kind: a.question_type,
    retired: a.retired,
    text: text.trim(),
    file: file
      ? {
          id: file.id,
          filename: file.filename,
          contentType: file.content_type,
          size: file.size,
          available: file.available,
        }
      : null,
  };
}

/**
 * GET /sessions/{id}/answers — what the mentee wrote when booking, one entry
 * per **answered** question, in form order. The list comes whole
 * (`next_cursor` is always null), and both parties may read it.
 *
 * `active`: the details panel is open on this booking. Nothing fetches until
 * then — a list of twenty rows must not make twenty requests.
 */
export function useBookingAnswers(
  bookingId: string | null,
  active: boolean,
): Remote<BookingAnswer[]> {
  const session = useSession();
  const enabled = active && !!bookingId && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.bookings.answers(bookingId ?? '', sessionKey(session)),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/sessions/{session_id}/answers', {
        params: { path: { session_id: bookingId! } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return data.data.map(toAnswer);
    },
    // What someone wrote when booking does not change.
    staleTime: 5 * 60_000,
    networkMode: 'always',
    retry: retryOnce,
  });
  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    error: query.isError ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}
