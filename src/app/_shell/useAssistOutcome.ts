'use client';

import { useMemo, useRef } from 'react';
import type { AiChange, AssistMode } from '@/components/molecules/AiField/AiField';
import { track } from '@/lib/analytics/track';
import type { AssistField } from '@/lib/api/data/writingAssist';

/**
 * PRD 30 `writing_assist_used`: what the person did with an AI change, told
 * once per change. The box reports a change and its Undo (AiField
 * `onAiChange`); only the screen that owns the save knows it was kept, so it
 * calls `accepted` once the save lands and `discarded` when the edit is
 * thrown away (Cancel, Discard, Start over). An outcome with no AI change
 * pending sends nothing, so a second call can't count twice.
 *
 * Leaving without Save or Discard (closing the tab, navigating away) sends
 * nothing: that under-count is accepted rather than guessing an outcome.
 */
export function useAssistOutcome(field: AssistField) {
  // The mode of the AI change in the box, until its outcome is known. A later
  // change replaces it: the person is still deciding.
  const pending = useRef<AssistMode | null>(null);
  return useMemo(() => {
    const settle = (outcome: 'accepted' | 'discarded') => {
      const mode = pending.current;
      if (!mode) return;
      pending.current = null;
      track('writing_assist_used', { field, mode, outcome });
    };
    return {
      onAiChange: (change: AiChange) => {
        if (change.kind === 'applied') pending.current = change.mode;
        else settle('discarded');
      },
      /** An AI change landed outside the box (the application's first About draft). */
      applied: (mode: AssistMode) => {
        pending.current = mode;
      },
      accepted: () => settle('accepted'),
      discarded: () => settle('discarded'),
    };
  }, [field]);
}
