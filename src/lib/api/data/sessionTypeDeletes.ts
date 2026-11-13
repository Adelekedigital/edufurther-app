'use client';

import { useCallback, useState } from 'react';
import type { DeleteError } from '@/types/sessionType';
import { useDeleteSessionType } from './sessionTypes';

/**
 * Session-type deletes by row, for a screen that lets one be dismissed while
 * it's out and another started meanwhile (Session types, the profile's owner
 * view). The delete hook's pending and error are only its latest call's: with
 * two out, one row would look idle and its refusal would show in no dialog
 * (issue 128). Each row's state is kept here instead, until it starts again
 * or the screen clears it.
 */
export function useSessionTypeDeletes() {
  const { remove: send } = useDeleteSessionType();
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [refusals, setRefusals] = useState<Record<string, DeleteError>>({});
  const clearRefusal = useCallback(
    (id: string) => setRefusals(({ [id]: _cleared, ...rest }) => rest),
    [],
  );
  const remove = useCallback(
    (id: string) => {
      const settle = () => setPendingIds((ids) => ids.filter((x) => x !== id));
      clearRefusal(id);
      setPendingIds((ids) => [...ids, id]);
      return send(id).then(
        (r) => {
          settle();
          return r;
        },
        (e: DeleteError) => {
          settle();
          setRefusals((r) => ({ ...r, [id]: e }));
          throw e;
        },
      );
    },
    [send, clearRefusal],
  );
  return { remove, pendingIds, refusals, clearRefusal };
}
