'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { lazyPart } from '@/components/molecules/LazyPart/lazyPart';
import { LADDER_UNKNOWN, type LadderProgress } from '@/lib/utils/credits';

// The reads load with the card, never in a page's first-load JS (350kB
// budget). Quiet: a failed load leaves the rows on the level alone.
const CreditLadderReads = lazyPart(
  () => import('./CreditLadderReads').then((m) => m.CreditLadderReads),
  { quiet: true },
);

/**
 * The credits card's ladder reads, for a mentee (`userId`, null otherwise):
 * nothing until the card first opens (`onOpen`), never on every page load.
 * `host` does the reading; the shell's layout renders it once.
 */
export function useCreditLadder(userId: string | null): {
  progress: LadderProgress;
  onOpen: () => void;
  host: ReactNode;
} {
  const [wanted, setWanted] = useState(false);
  // Kept with whose it is, so another account never sees the last one's ticks.
  const [read, setRead] = useState<{ userId: string; progress: LadderProgress } | null>(null);
  const onProgress = useCallback(
    (progress: LadderProgress) => {
      if (userId) setRead({ userId, progress });
    },
    [userId],
  );
  const active = wanted && !!userId;
  return {
    progress: active && read?.userId === userId ? read.progress : LADDER_UNKNOWN,
    onOpen: () => setWanted(true),
    host: active ? <CreditLadderReads userId={userId} onProgress={onProgress} /> : null,
  };
}
