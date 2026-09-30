'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { DURATIONS } from '@/lib/utils/sessionTypeDraft';
import { apiError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { generalCopy, ItemSaveError } from './profileItems';

export type QuickEdit = {
  id: string;
  /** Sent only when it changed; a new length must be one of DURATIONS. */
  durationMin?: number;
  live?: boolean;
};

// The same key as the Session types rows' writes (sessionTypes.ts), so a list
// refetch never lands between this save and a switch still in flight. Swap for
// the exported ROW_WRITE and settleRowWrite once they land (confirms PR).
const ROW_WRITE = ['sessionTypes', 'rowWrite'] as const;
function settle(qc: QueryClient) {
  if (qc.isMutating({ mutationKey: ROW_WRITE }) > 1) return;
  return Promise.all([
    qc.invalidateQueries({ queryKey: keys.sessionTypes.all }),
    // What mentees see and can book: the profile, Explore cards, the booking flow.
    qc.invalidateQueries({ queryKey: keys.mentors.all }),
    qc.invalidateQueries({ queryKey: ['booking'] }),
  ]);
}

/**
 * The profile's quick edit (Mentor Profile.dc.html `editType`): length and
 * visibility, PATCH /me/session-types/{id}. Not optimistic: the modal waits for
 * the save and the refetch, then closes.
 */
export function useQuickEditSessionType() {
  const qc = useQueryClient();
  return useMutation<void, ItemSaveError, QuickEdit>({
    mutationKey: ROW_WRITE,
    // Offline, fail at once with our copy rather than pause and send later.
    networkMode: 'always',
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
    onSettled: () => settle(qc),
  });
}
