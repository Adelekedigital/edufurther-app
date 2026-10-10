'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { BookingAnswer } from '@/types/booking';
import type { Remote } from '@/types/mentor';
import { remote } from './bookings';
import { apiError, retryOnce } from './errors';
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
    // The wording **as asked**, kept with the answer since backend #360 (which
    // closed #350). A mentor rewording a question no longer relabels answers
    // given after that; only answers from before it fall back to the live
    // wording, because nothing was stored for them.
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
  userId: string,
  active: boolean,
): Remote<BookingAnswer[]> {
  const session = useSession();
  // `!!userId` like every other read on this screen: this is the one hook that
  // would otherwise fire before we know who is asking.
  const enabled = active && !!bookingId && !!userId && session.status !== 'unknown';
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
  // The shared shape, so `isLoading` cannot come to mean one thing here and
  // another in the hook beside it.
  return remote(query, () => void query.refetch(), enabled);
}
