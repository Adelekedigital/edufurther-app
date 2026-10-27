'use client';

import { useEffect, useState } from 'react';
import { Snackbar } from '@/components/molecules/Snackbar/Snackbar';
import { MOVE_COPY } from '@/lib/copy/session';
import {
  takeMoveFailure,
  useLeftMoveFailure,
  type LeftMoveFailure,
} from '@/lib/api/data/moveSession';
import { dayLabel } from '@/lib/utils/format';

/**
 * A mentee's move whose booking was refused after they had left Session Join
 * (PRD fix 1): the old session is canceled and the credit is back, and the
 * page that would have said so has gone. Bookings, where the canceled session
 * now is, says it once, in the same words as the page's notice.
 */
export function MoveFailureSnackbar({ timeZone }: { timeZone: string }) {
  const left = useLeftMoveFailure();
  // Kept here once seen (adjusting state while rendering), since the store
  // gives it up below: it is said in one place, one time.
  const [shown, setShown] = useState<{ failure: LeftMoveFailure; at: number } | null>(null);
  if (left && left !== shown?.failure) setShown((s) => ({ failure: left, at: (s?.at ?? 0) + 1 }));
  useEffect(() => {
    if (left) takeMoveFailure();
  }, [left]);
  const f = shown?.failure;
  const text = f
    ? `${MOVE_COPY.failedTitle}. ${MOVE_COPY.failedBody(dayLabel(f.booking.startsAt, timeZone), f.why, f.booking.other.firstName)}`
    : null;
  return <Snackbar message={text} stamp={shown?.at} />;
}
