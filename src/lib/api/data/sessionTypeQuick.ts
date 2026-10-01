'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DURATIONS } from '@/lib/utils/sessionTypeDraft';
import type { OwnSessionType } from '@/types/sessionType';
import { apiError } from './errors';
import { api } from './http';
import { generalCopy, ItemSaveError } from './profileItems';
import { rowWrite } from './sessionTypes';

export type QuickEdit = {
  id: string;
  /** Sent only when it changed; a new length must be one of DURATIONS. */
  durationMin?: number;
  live?: boolean;
};

/**
 * The profile's quick edit (Mentor Profile.dc.html `editType`): length and
 * visibility, PATCH /me/session-types/{id}. Not optimistic: the modal waits for
 * the save. Session types' row-write bundle refetches the list, the profile and
 * booking once no other row write is in flight, so the refetch never races a
 * switch (and an offline save fails at once rather than pausing).
 */
export function useQuickEditSessionType() {
  const qc = useQueryClient();
  return useMutation<void, ItemSaveError, QuickEdit>({
    ...rowWrite(qc),
    mutationFn: async ({ id, durationMin, live }) => {
      if (durationMin !== undefined && !DURATIONS.includes(durationMin))
        throw new ItemSaveError(generalCopy(null));
      try {
        const { error, response } = await api.PATCH('/api/v1/me/session-types/{session_type_id}', {
          params: { path: { session_type_id: id } },
          body: {
            ...(durationMin !== undefined && { duration_minutes: durationMin }),
            ...(live !== undefined && { is_active: live }),
          },
        });
        if (!response.ok) throw apiError(response.status, error);
      } catch (e) {
        throw new ItemSaveError(generalCopy(e));
      }
    },
    // The card shows the save at once (a hidden one leaves); the bundle's
    // refetch still has the last word (review of PR 119).
    onSuccess: (_d, { id, durationMin, live }) => {
      qc.setQueriesData<OwnSessionType[]>({ queryKey: ['sessionTypes', 'own'] }, (list) =>
        list?.map((t) =>
          t.id === id
            ? {
                ...t,
                ...(durationMin !== undefined && { durationMin }),
                ...(live !== undefined && { isLive: live }),
              }
            : t,
        ),
      );
    },
  });
}
