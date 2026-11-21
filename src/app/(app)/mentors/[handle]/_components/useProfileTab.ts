'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { replaceQuery } from '@/lib/utils/replaceQuery';

export type ProfileTab = 'overview' | 'sessions' | 'reviews';

/**
 * The profile's tab, kept in the URL (`?tab=`), so a shared link and Back keep
 * it. A tab with nothing in it (no sessions, no reviews) falls back to Overview.
 */
export function useProfileTab(hasSessions: boolean, hasReviews: boolean) {
  const pathname = usePathname();
  const params = useSearchParams();
  const asked = params.get('tab');
  const tab: ProfileTab =
    asked === 'sessions' && hasSessions
      ? 'sessions'
      : asked === 'reviews' && hasReviews
        ? 'reviews'
        : 'overview';
  const setTab = (t: string) => {
    // Change only `tab`: a shared link's other parameters (utm_*) stay.
    const next = new URLSearchParams(params.toString());
    if (t === 'sessions' || t === 'reviews') next.set('tab', t);
    else next.delete('tab');
    const qs = next.toString();
    replaceQuery(qs ? `${pathname}?${qs}` : pathname);
  };
  return { tab, setTab };
}
