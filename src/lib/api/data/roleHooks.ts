'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppError } from '@/types/mentor';
import { keys } from './keys';
import { savePrimaryRole } from './roles';
import { patchViewer } from './viewer';

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
 * A fresh account's switch between the two onboardings (owner, 2026-10-20):
 * saves the role, then turns the cached viewer to it at once, as
 * useContinueAsMentee does, so the page's role redirect takes them to the
 * other flow. It routes nowhere itself: one navigation, even if the refetch fails.
 */
export function useSwitchRole(userId: string | null) {
  const qc = useQueryClient();
  const { setRole, isPending, error } = useSetPrimaryRole(userId);
  const switchTo = async (role: 'mentee' | 'mentor') => {
    await setRole(role);
    patchViewer(qc, { signedUpAsMentor: role === 'mentor' });
  };
  return { switchTo, isPending, error };
}
