'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppError, Remote } from '@/types/mentor';
import { ApiError, apiError, normaliseError, retryOnce } from './errors';
import { keys } from './keys';
import { APPROVED_SEEN_PATH, untyped, type PendingMe, type PendingProfileRole } from './pending';

type Person = {
  /** "Gbenga", or the email's name when the account has none. */
  firstName: string;
  /** "Gbenga Ekundayo": the mailto's subject and Name line. */
  fullName: string;
  email: string;
};

/**
 * Where the viewer's mentor application stands (PRD "Where people land", read
 * from GET /me). `none`: no mentor profile; `unsubmitted`: started, never sent.
 */
export type MentorApplication =
  | { stage: 'none' }
  | { stage: 'unsubmitted' }
  | ({ stage: 'pending' } & Person)
  | ({ stage: 'approved'; seen: boolean } & Person)
  | ({ stage: 'declined'; note: string | null; reviewedAt: string | null } & Person);

/**
 * /me → the application's stage. A field the backend hasn't shipped yet reads
 * as today's behaviour: no `submitted_at` means a profile is an application
 * (creating one used to apply), and no `approved_seen_at` means already seen,
 * so the approved screen never shows twice on an older backend.
 */
export function toMentorApplication(me: PendingMe): MentorApplication {
  const p = me.mentor_profile;
  if (!p) return { stage: 'none' };
  const firstName = me.first_name?.trim() || me.email.split('@')[0] || '';
  const fullName =
    [me.first_name?.trim(), me.last_name?.trim()].filter(Boolean).join(' ') || firstName;
  const person = { firstName, fullName, email: me.email };
  if (p.approval_status === 'approved')
    return { stage: 'approved', seen: p.approved_seen_at !== null, ...person };
  if (p.approval_status === 'declined')
    return {
      stage: 'declined',
      note: p.review_note?.trim() || null,
      reviewedAt: p.reviewed_at ?? null,
      ...person,
    };
  if (p.submitted_at === null) return { stage: 'unsubmitted' };
  return { stage: 'pending', ...person };
}

/** GET /me, read for the application only (the viewer drops these fields). */
export function useMentorApplication(
  userId: string | null,
): Remote<MentorApplication> & { fresh: boolean } {
  const query = useQuery({
    queryKey: keys.viewer.mentorApplication(userId ?? 'none'),
    enabled: userId !== null,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await untyped.GET('/api/v1/me', { signal });
      if (!data) throw apiError(response.status, error);
      return toMentorApplication(data as PendingMe);
    },
    retry: retryOnce,
    // What the page shows is decided once (approved-seen flips it), so a
    // refocus must not move the mentor off the screen they are reading.
    refetchOnWindowFocus: false,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
    // A cached read from earlier in the visit may predate approved-seen.
    fresh: !query.isFetching,
  };
}

/**
 * POST approved-seen (PRD B3), as the approved screen renders. Idempotent, and
 * a 409 (not approved after all) changes nothing on screen: the mentor reads
 * the page either way, and the next visit asks the server again. Once it
 * lands, the cached read says seen too, so coming back in the same visit
 * (Back from the dashboard) never shows the screen a second time.
 */
export function useMarkApprovedSeen(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<void, AppError, void>({
    mutationFn: async () => {
      const { error, response } = await untyped.POST(APPROVED_SEEN_PATH);
      if (!response.ok && response.status !== 409) throw apiError(response.status, error);
    },
    onSuccess: () =>
      qc.setQueryData<MentorApplication>(keys.viewer.mentorApplication(userId ?? 'none'), (a) =>
        a?.stage === 'approved' ? { ...a, seen: true } : a,
      ),
  });
  return { markSeen: mutation.mutate, isPending: mutation.isPending };
}

/**
 * "Continue as a mentee": PATCH primary_role (PRD B3, decision #17: a
 * dashboard hint only). The application stays saved.
 */
export function useContinueAsMentee(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<void, AppError, void>({
    mutationFn: async () => {
      let r;
      try {
        r = await untyped.PATCH('/api/v1/users/{user_id}/profile', {
          params: { path: { user_id: userId! } },
          body: { primary_role: 'mentee' } satisfies PendingProfileRole,
        });
      } catch (e) {
        throw normaliseError(e);
      }
      if (!r.response.ok) throw normaliseError(new ApiError(r.response.status));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.viewer.all }),
  });
  return {
    continueAsMentee: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
