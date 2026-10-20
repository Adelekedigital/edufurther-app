import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppError, Viewer } from '@/types/mentor';
import { ApiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

/**
 * A declined applicant who chose "Continue as a mentee" (owner, 2026-10-18):
 * `primary_role` mentee on a declined profile. They are mentee-side
 * everywhere; the application stays saved for support. Only this pairing
 * reads `primary_role` (decision #17: otherwise a dashboard hint only).
 */
export function menteeByChoice(me: {
  mentor_profile?: { approval_status: string } | null;
  primary_role?: string | null;
}): boolean {
  return me.mentor_profile?.approval_status === 'declined' && me.primary_role === 'mentee';
}

/**
 * The account's role hint (`primary_role`, PATCH /users/{id}/profile). One
 * mutation for every place that sets it: "Continue as a mentee", and a mentor
 * sign-up remembered on the account. It never grants anything (decision #17);
 * it only picks the onboarding and the home.
 */
export async function savePrimaryRole(userId: string, role: 'mentee' | 'mentor'): Promise<void> {
  let r;
  try {
    r = await api.PATCH('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: userId } },
      body: { primary_role: role },
    });
  } catch (e) {
    throw normaliseError(e);
  }
  if (!r.response.ok) throw normaliseError(new ApiError(r.response.status));
}

export function useSetPrimaryRole(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<void, AppError, 'mentee' | 'mentor'>({
    mutationFn: (role) => savePrimaryRole(userId!, role),
    // Route on a fresh /me, never the cached one (backend, 2026-10-20).
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.viewer.all }),
  });
  return { setRole: mutation.mutateAsync, isPending: mutation.isPending, error: mutation.error };
}

/**
 * A mentor sign-up is remembered on the account (owner, 2026-10-20): the
 * first time a member with no mentor profile arrives with `role=mentor`,
 * `primary_role` becomes mentor, so a later visit without the query, on any
 * device, still continues as a mentor. Returns true while that's being saved,
 * so the page can wait before routing.
 */
export function useRememberMentorSignup(viewer: Viewer, roleHint: string | null): boolean {
  const member = viewer.kind === 'member' ? viewer : null;
  // A fresh account only: no mentor profile and no mentee goal. A link never
  // re-roles an account that has settled (one role per account), such as a
  // mentee, or a declined applicant who chose "Continue as a mentee".
  const needed =
    !!member &&
    roleHint === 'mentor' &&
    !member.hasMentorProfile &&
    !member.isMentee &&
    !member.signedUpAsMentor;
  const { setRole } = useSetPrimaryRole(member?.id ?? null);
  const sent = useRef(false);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!needed || sent.current) return;
    sent.current = true;
    // Either way the page goes on: a failure leaves this visit's query in
    // charge, and the next visit with it tries again.
    setRole('mentor')
      .catch(() => {})
      .finally(() => setSettled(true));
  }, [needed, setRole]);
  return needed && !settled;
}
