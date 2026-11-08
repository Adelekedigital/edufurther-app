'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePreview, type usePreviewActions } from '@/lib/api/data/preview';
import { previewStore } from '@/lib/api/data/previewStore';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import type { Viewer } from '@/types/mentor';

export const VIEW_AS_PARAM = 'viewAs';

/**
 * `?viewAs={email}` on any app URL (PRD, Ways in):
 * - a signed-in admin who may preview: starts that preview, and the parameter
 *   leaves the address bar with no history entry (Back never returns to it);
 *   an email nobody previewable has opens the bar with the red note;
 * - mid-preview (the viewer is the previewed person, who can't preview): the
 *   admin's own tab, so it switches to that email too;
 * - signed out: Sign in, then back to the same URL;
 * - anyone else: not found, as the API answers 404 (the feature isn't revealed).
 * Returns whether the page should show not found.
 */
export function useViewAsParam(
  viewer: Viewer,
  previewing: boolean,
  preview: ReturnType<typeof usePreviewActions>['preview'],
): boolean {
  const router = useRouter();
  const pathname = usePathname();
  const { denied } = usePreview();
  const handled = useRef<string | null>(null);
  const may = viewer.kind === 'member' && (viewer.canPreviewAsUser === true || previewing);

  useEffect(() => {
    const url = new URL(window.location.href);
    const email = url.searchParams.get(VIEW_AS_PARAM)?.trim();
    if (!email) return;
    // Who's asking isn't known yet: wait for /me.
    if (viewer.kind === 'loading') return;
    if (handled.current === url.href) return;
    handled.current = url.href;
    if (viewer.kind === 'guest') {
      router.replace(
        `/login?next=${encodeURIComponent(safeReturnTo(url.pathname + url.search, '/'))}`,
      );
      return;
    }
    url.searchParams.delete(VIEW_AS_PARAM);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    if (!may) {
      previewStore.deny(url.pathname);
      return;
    }
    void preview({ email }, url.pathname);
  }, [viewer.kind, may, pathname, router, preview]);

  // Not found holds only for the visit it was asked on: leaving that page
  // clears it, so a later plain visit to the same path shows the page (GitHub review).
  useEffect(() => {
    if (denied !== null && denied !== pathname) previewStore.undeny();
  }, [denied, pathname]);
  return denied !== null && denied === pathname;
}
