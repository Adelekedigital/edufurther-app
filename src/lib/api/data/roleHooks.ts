'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppError } from '@/types/mentor';
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
