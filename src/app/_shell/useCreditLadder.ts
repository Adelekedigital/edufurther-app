'use client';

import { useState } from 'react';
import { useReferrals } from '@/lib/api/data/invite';
import { useMenteeStats, type MenteeStats } from '@/lib/api/data/menteeHome';
import { LADDER_UNKNOWN, type LadderProgress } from '@/lib/utils/credits';

/**
 * What ticks the ladder's session and friend steps (decision 370): attended
 * from `sessions_attended` (not `sessions_held`), the friend from any referral
 * with `qualified_at`. Null while a read is pending, failed or not sent, so a
 * step is never ticked on a guess.
 */
export function ladderProgress(
  stats: MenteeStats | null,
  referrals: { data: unknown[] | null; friendJoined: boolean },
): LadderProgress {
  const attended = stats?.sessionsAttended;
  return {
    attended: typeof attended === 'number' ? attended >= 1 : null,
    friendJoined: referrals.data ? referrals.friendJoined : null,
  };
}

/**
 * The credits card's ladder reads, for a mentee (`userId`, null otherwise):
 * nothing until the card first opens (`onOpen`), never on every page load.
 * The same queries as Home, so a visit there has usually filled them.
 */
export function useCreditLadder(userId: string | null): {
  progress: LadderProgress;
  onOpen: () => void;
} {
  const [wanted, setWanted] = useState(false);
  const active = wanted && !!userId;
  const stats = useMenteeStats(userId, active);
  const referrals = useReferrals(userId, active);
  return {
    progress: active ? ladderProgress(stats.data, referrals) : LADDER_UNKNOWN,
    onOpen: () => setWanted(true),
  };
}
