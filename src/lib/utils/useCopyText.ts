'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Copy text to the clipboard and hold the outcome for `resetMs`, then settle
 * back to idle. Shared by every copy-a-link control (CopyLinkButton,
 * InviteModal). No clipboard API outside secure contexts (plain-http previews,
 * some webviews): that reads as `failed`, never as copied.
 */
export function useCopyText(resetMs: number) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      const settle = (s: 'copied' | 'failed') => {
        clearTimeout(timer.current);
        setState(s);
        timer.current = setTimeout(() => setState('idle'), resetMs);
      };
      const done = navigator.clipboard?.writeText(text);
      if (!done) {
        settle('failed');
        return false;
      }
      try {
        await done;
        settle('copied');
        return true;
      } catch {
        settle('failed');
        return false;
      }
    },
    [resetMs],
  );

  return { state, copy };
}
