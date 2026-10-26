'use client';

import { useState } from 'react';
import {
  isoWeekKey,
  readWeekMoves,
  weekMovesKey,
  writeWeekMoves,
  type MoveKey,
} from '@/lib/utils/weekMoves';

/**
 * The "Do this week" moves pressed this ISO week (PRD Mentor Home), kept on
 * this device per mentor and week. `now` ticks, so a new week starts clean
 * without a reload.
 */
export function useWeekMoves(userId: string, timeZone: string, now: Date) {
  const key = weekMovesKey(userId, isoWeekKey(now, timeZone));
  const [state, setState] = useState(() => ({ key, done: readWeekMoves(key) }));
  // A new week (or mentor): read that week's flags.
  if (state.key !== key) setState({ key, done: readWeekMoves(key) });
  const done = state.key === key ? state.done : [];
  const mark = (move: MoveKey) => {
    if (done.includes(move)) return;
    const next = [...done, move];
    writeWeekMoves(key, next);
    setState({ key, done: next });
  };
  return { done, mark };
}
