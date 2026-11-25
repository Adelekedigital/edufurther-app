'use client';

import { useEffect } from 'react';
import { useReferrals } from '@/lib/api/data/invite';
import { useMenteeStats, type MenteeStats } from '@/lib/api/data/menteeHome';
import type { LadderProgress } from '@/lib/utils/creditLadder';

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
 * The credits card's two reads, drawn nothing. Loaded only once a mentee
 * opens the card (`useCreditLadder`), so neither hook is in any page's
 * first-load JS (350kB budget). The same queries as Home, so a visit there has
 * usually filled them.
 */
export function CreditLadderReads({
  userId,
  onProgress,
}: {
  userId: string;
  onProgress: (p: LadderProgress) => void;
}) {
  const stats = useMenteeStats(userId);
  const referrals = useReferrals(userId);
  const { attended, friendJoined } = ladderProgress(stats.data, referrals);
  useEffect(() => {
    onProgress({ attended, friendJoined });
  }, [attended, friendJoined, onProgress]);
  return null;
}
