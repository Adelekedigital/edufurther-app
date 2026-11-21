'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppError, Remote } from '@/types/mentor';
import { ApiError, apiError, normaliseError } from './errors';
import type { components } from '@/lib/api/generated/schema';
import { api } from './http';
import { patchMe, useMeSlice, type MeRead } from './me';
import { isPreviewing } from './previewStore';
import { patchViewer } from './viewer';
import { useSetPrimaryRole } from './roleHooks';
import { mentorStageOf } from '@/lib/utils/access';

type UserRead = components['schemas']['UserRead'];

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
export function toMentorApplication(me: UserRead): MentorApplication {
  const p = me.mentor_profile;
  if (!p) return { stage: 'none' };
  const firstName = me.first_name?.trim() || me.email.split('@')[0] || '';
  const fullName =
    [me.first_name?.trim(), me.last_name?.trim()].filter(Boolean).join(' ') || firstName;
  const person = { firstName, fullName, email: me.email };
  // The stage rule is shared with the viewer and the setup lock (lib/utils/access).
  const stage = mentorStageOf(p);
  if (stage === 'approved')
    return { stage: 'approved', seen: p.approved_seen_at !== null, ...person };
  if (stage === 'declined')
    return {
      stage: 'declined',
      note: p.review_note?.trim() || null,
      reviewedAt: p.reviewed_at ?? null,
      ...person,
    };
  if (stage === 'unsubmitted') return { stage: 'unsubmitted' };
  return { stage: 'pending', ...person };
}

const applicationOf = ({ me }: MeRead) => toMentorApplication(me);

/**
 * The application's stage, a slice of the one /me (me.ts). The page decides
 * once what it shows (approved-seen flips it), so this read asks /me afresh
 * as the page opens: a cached one from earlier in the visit (or another tab)
 * may predate approved-seen. A refocus doesn't ask again from here.
 */
export function useMentorApplication(
  userId: string | null,
): Remote<MentorApplication> & { fresh: boolean } {
  const read = useMeSlice(userId !== null, applicationOf, {
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
  return {
    data: read.data,
    isLoading: read.status === 'loading' && userId !== null,
    error: read.status === 'error' ? normaliseError(read.error) : null,
    retry: read.retry,
    fresh: !read.retrying,
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
      // Preview as user: an admin reading the approved screen isn't the mentor seeing it.
      if (isPreviewing()) return;
      const { error, response } = await api.POST('/api/v1/me/mentor-application/approved-seen');
      if (!response.ok && response.status !== 409) throw apiError(response.status, error);
    },
    onSuccess: () => {
      // Nothing was sent in preview: the previewed mentor hasn't seen it, so the cache says so too.
      if (isPreviewing()) return;
      // Into the one /me: this page's read and the viewer (Home stops sending
      // them back here, and its toast) both say seen now.
      const at = new Date().toISOString();
      patchMe(qc, (me) =>
        me.mentor_profile?.approval_status === 'approved' &&
        me.mentor_profile.approved_seen_at === null
          ? { ...me, mentor_profile: { ...me.mentor_profile, approved_seen_at: at } }
          : me,
      );
    },
  });
  return { markSeen: mutation.mutate, isPending: mutation.isPending };
}

/**
 * "Continue as a mentee": PATCH primary_role (PRD B3, decision #17: a
 * dashboard hint only). The application stays saved. The cached viewer turns
 * mentee-side at once (menteeByChoice, as /me will say), so the page's role
 * redirect takes them to their home; the screen itself routes nowhere, which
 * leaves one navigation and no race, even if the refetch fails.
 */
export function useContinueAsMentee(userId: string | null) {
  const qc = useQueryClient();
  const { setRole, isPending, error } = useSetPrimaryRole(userId);
  const continueAsMentee = async () => {
    await setRole('mentee');
    patchViewer(qc, { isMentor: false, mentorStage: 'none' });
  };
  return { continueAsMentee, isPending, error };
}
