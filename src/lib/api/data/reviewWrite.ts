'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type {
  AppError,
  AttributeScore,
  MyReview,
  Remote,
  ReviewAnswers,
  ReviewableSession,
} from '@/types/mentor';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

type ReviewWrite = components['schemas']['ReviewWrite'];
type ReviewEdit = components['schemas']['ReviewEdit'];

type ReviewRead = components['schemas']['ReviewRead'];
type AuthoredReviewRead = components['schemas']['AuthoredReviewRead'];
type AuthoredReviewSummaryRead = components['schemas']['AuthoredReviewSummaryRead'];

/** Any read of the viewer's own review: the list row, the full author read, or a POST/PATCH reply. */
type AnyOwnRead = AuthoredReviewSummaryRead & Partial<AuthoredReviewRead> & Partial<ReviewRead>;

// ---- mapping ----------------------------------------------------------------

export function toMyReview(r: AnyOwnRead): MyReview {
  const a: Partial<ReviewAnswers> = {};
  // A review written before the stars has no overall_rating; its stars are its
  // valuable_rating (the backend's rule for the same case).
  if (r.overall_rating != null) a.overall = r.overall_rating;
  else if (r.valuable_rating != null) a.overall = r.valuable_rating;
  a.text = r.public_review;
  if (r.communication_rating) a.communication = r.communication_rating;
  if (r.knowledge_rating) a.knowledge = r.knowledge_rating;
  if (r.support_rating) a.support = r.support_rating;
  if (r.practicality_rating) a.practicality = r.practicality_rating;
  if (r.valuable_rating != null) a.value = r.valuable_rating;
  if (r.nps_recommend_score != null) a.recommend = r.nps_recommend_score;
  if (r.private_review != null) a.platformNote = r.private_review;
  const open = r.editable_until && Date.parse(r.editable_until) > Date.now();
  return {
    id: r.id,
    createdAt: r.created_at,
    editableUntil: open ? r.editable_until! : null,
    answers: a,
  };
}

function toWrite(sessionId: string, x: ReviewAnswers): ReviewWrite {
  return {
    session_id: sessionId,
    overall_rating: x.overall,
    public_review: x.text.trim(),
    communication_rating: x.communication,
    knowledge_rating: x.knowledge,
    support_rating: x.support,
    practicality_rating: x.practicality,
    valuable_rating: x.value,
    nps_recommend_score: x.recommend,
    private_review: x.platformNote.trim() || null,
  };
}

/** Only what changed (PATCH: every field may be omitted). */
export function toEdit(before: Partial<ReviewAnswers>, after: ReviewAnswers): ReviewEdit {
  const out: ReviewEdit = {};
  const text = after.text.trim();
  if (after.overall !== before.overall) out.overall_rating = after.overall;
  if (text !== (before.text ?? '').trim()) out.public_review = text;
  if (after.communication !== before.communication) out.communication_rating = after.communication;
  if (after.knowledge !== before.knowledge) out.knowledge_rating = after.knowledge;
  if (after.support !== before.support) out.support_rating = after.support;
  if (after.practicality !== before.practicality) out.practicality_rating = after.practicality;
  if (after.value !== before.value) out.valuable_rating = after.value;
  if (after.recommend !== before.recommend) out.nps_recommend_score = after.recommend;
  const note = after.platformNote.trim();
  if (note !== (before.platformNote ?? '').trim()) out.private_review = note || null;
  // Unanswered (a question the API didn't return and the viewer left alone:
  // 0 or empty) is never sent; the stored answer stands.
  for (const k of Object.keys(out) as (keyof ReviewEdit)[]) {
    const v = out[k];
    if (v === undefined || v === 0) delete out[k];
  }
  return out;
}

// ---- errors -------------------------------------------------------------------

export type ReviewSendError =
  | { kind: 'alreadyReviewed'; message: string }
  | { kind: 'tooSoon'; message: string }
  | { kind: 'editClosed'; message: string }
  | (AppError & { kind: AppError['kind'] });

export function sendError(e: unknown, editing: boolean): ReviewSendError {
  if (e instanceof ApiError && e.status === 409) {
    if (editing)
      return {
        kind: 'editClosed',
        message: 'The edit window has closed, so your review stands as written.',
      };
    if (e.type?.endsWith('/problems/review-already-exists'))
      return { kind: 'alreadyReviewed', message: 'You’ve already reviewed this session.' };
    if (e.type?.endsWith('/problems/review-interval-not-elapsed'))
      return {
        kind: 'tooSoon',
        message: 'You reviewed this recently. You can add a new review after your next session.',
      };
  }
  const n = normaliseError(e);
  return n.kind === 'offline'
    ? { ...n, message: 'You’re offline. Your review is still here; send it once you’re back.' }
    : { ...n, message: 'We couldn’t send your review. Try again.' };
}

// ---- hooks ------------------------------------------------------------------

/** GET /me/reviewable-sessions?mentor_id=: newest first. Members only. */
export function useReviewableSessions(
  mentorId: string | null,
  enabled: boolean,
): Remote<ReviewableSession[]> {
  const session = useSession();
  const query = useQuery({
    queryKey: keys.mentors.reviewable(mentorId ?? '', sessionKey(session)),
    enabled: enabled && !!mentorId && session.status !== 'unknown',
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/me/reviewable-sessions', {
        params: { query: { mentor_id: mentorId! } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return data.data
        .map((s) => ({
          id: s.session_id,
          startsAt: s.starts_at,
          typeName: s.session_type_name ?? null,
        }))
        .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
    },
    staleTime: 60_000,
    retry: false,
  });
  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/**
 * The viewer's own review of this mentor (GET /me/authored-reviews?mentor_id=),
 * or null: enough for the "Your review" tag and the "live" note. The full
 * review (for editing) is `useAuthoredReview`.
 */
export function useMyReview(mentorId: string | null, enabled: boolean): Remote<MyReview | null> {
  const session = useSession();
  const query = useQuery({
    queryKey: keys.mentors.myReview(mentorId ?? '', sessionKey(session)),
    enabled: enabled && !!mentorId && session.status !== 'unknown',
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/me/authored-reviews', {
        params: { query: { mentor_id: mentorId!, limit: 1 } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      const row = data.data[0];
      return row ? toMyReview(row) : null;
    },
    staleTime: 60_000,
    retry: false,
  });
  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/**
 * The author's full review (GET /reviews/{id}, AuthoredReviewRead), to pre-fill
 * Edit. `fetchedAt` lets the caller insist on a copy fetched after Edit opened:
 * a cached one can be older than the last save.
 */
export function useAuthoredReview(
  reviewId: string | null,
  enabled: boolean,
): Remote<MyReview> & { fetchedAt: number; failedAt: number } {
  const session = useSession();
  const query = useQuery({
    queryKey: keys.reviews.authored(reviewId ?? '', sessionKey(session)),
    enabled: enabled && !!reviewId && session.status !== 'unknown',
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/reviews/{review_id}', {
        params: { path: { review_id: reviewId! } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return toMyReview(data);
    },
    // Fresh on every open: the query is enabled only while Edit is open, and
    // enabling a stale query (staleTime 0) refetches it.
    staleTime: 0,
    // Offline, fail at once (the error + "Try again" state) rather than pause
    // with an endless skeleton (review r2 of #59), as the reviews list does.
    networkMode: 'always',
    retry: false,
  });
  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
    fetchedAt: query.dataUpdatedAt,
    failedAt: query.errorUpdatedAt,
  };
}

type SendArgs =
  | { mode: 'new'; mentorId: string; sessionId: string; answers: ReviewAnswers }
  | {
      mode: 'edit';
      mentorId: string;
      reviewId: string;
      before: Partial<ReviewAnswers>;
      answers: ReviewAnswers;
    };

/** POST /reviews or PATCH /reviews/{id}; one request per call (the caller guards clicks). */
export function useSendReview() {
  const qc = useQueryClient();
  const session = useSession();
  const mutation = useMutation({
    mutationFn: async (a: SendArgs): Promise<MyReview> => {
      if (a.mode === 'new') {
        const { data, error, response } = await api.POST('/api/v1/reviews', {
          body: toWrite(a.sessionId, a.answers),
        });
        if (!data) throw apiError(response.status, error);
        return toMyReview(data);
      }
      const { data, error, response } = await api.PATCH('/api/v1/reviews/{review_id}', {
        params: { path: { review_id: a.reviewId } },
        body: toEdit(a.before, a.answers),
      });
      if (!data) throw apiError(response.status, error);
      return toMyReview(data);
    },
    onSuccess: (mine, a) => {
      qc.setQueryData(keys.mentors.myReview(a.mentorId, sessionKey(session)), mine);
    },
    onSettled: (_d, _e, a) => {
      // The list, the summary, the note, what's left to review, and the viewer's
      // own review (also after a failure: a 409 means the window shut) all move.
      void qc.invalidateQueries({ queryKey: keys.mentors.reviewsAll });
      void qc.invalidateQueries({ queryKey: keys.mentors.profilesAll });
      void qc.invalidateQueries({ queryKey: keys.mentors.relationshipFor(a.mentorId) });
      void qc.invalidateQueries({ queryKey: keys.mentors.reviewableFor(a.mentorId) });
      void qc.invalidateQueries({ queryKey: keys.mentors.myReviewFor(a.mentorId) });
      void qc.invalidateQueries({ queryKey: keys.reviews.authoredAll });
    },
  });
  const editing = mutation.variables?.mode === 'edit';
  return {
    send: mutation.mutate,
    isPending: mutation.isPending,
    result: mutation.data ?? null,
    error: mutation.error ? sendError(mutation.error, editing) : null,
    reset: mutation.reset,
  };
}
