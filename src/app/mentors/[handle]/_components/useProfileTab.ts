'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type ProfileTab = 'overview' | 'sessions' | 'reviews';

/**
 * The profile's tab, kept in the URL (`?tab=`), so a shared link and Back keep
 * it. A tab with nothing in it (no sessions, no reviews) falls back to Overview.
 */
export function useProfileTab(hasSessions: boolean, hasReviews: boolean) {
  const router = useRouter();
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
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  return { tab, setTab };
}
