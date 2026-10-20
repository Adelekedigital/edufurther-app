'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppError, Viewer } from '@/types/mentor';
import { keys } from './keys';
import { savePrimaryRole } from './roles';

/** The shared role mutation as a hook: it refreshes the viewer, so pages route on a fresh /me. */
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
  // A fresh account only: no mentor profile, no mentee goal, and no
  // onboarding step saved yet (either flow). A link never
  // re-roles an account that has settled (one role per account), such as a
  // mentee, or a declined applicant who chose "Continue as a mentee".
  const needed =
    !!member &&
    roleHint === 'mentor' &&
    !member.hasMentorProfile &&
    !member.isMentee &&
    !member.onboardingStarted &&
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
