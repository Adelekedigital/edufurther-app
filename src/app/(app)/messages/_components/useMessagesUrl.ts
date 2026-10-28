'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * `/messages?with={personId}` is the open chat and `?settings=1` opens Message
 * emails (the emails' "Turn off these emails" link). Every other param (the dev
 * `mockViewer`, for one) is kept as it is.
 */
export function useMessagesUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const withId = params.get('with') || null;
  const settings = params.get('settings') === '1';

  const go = useCallback(
    (patch: Record<string, string | null>, how: 'push' | 'replace') => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router[how](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return {
    withId,
    settings,
    /**
     * Opens a chat. On phones it is a step forward (Back returns to the list),
     * so it's pushed; on desktop switching chats replaces.
     */
    openChat: useCallback(
      (id: string, push: boolean) => go({ with: id }, push ? 'push' : 'replace'),
      [go],
    ),
    closeChat: useCallback(() => go({ with: null }, 'replace'), [go]),
    dropSettings: useCallback(() => go({ settings: null }, 'replace'), [go]),
  };
}
