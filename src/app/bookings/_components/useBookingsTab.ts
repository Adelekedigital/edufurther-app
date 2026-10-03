'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { BookingTab } from '@/types/booking';

const TABS: BookingTab[] = ['upcoming', 'pending', 'history'];

/**
 * Which tab is showing, kept in the URL (`?tab=`) as the profile's is. The nav
 * badge sends people here to answer a request, so "Bookings, pending" has to be
 * a link someone can be sent — and Back has to come out of History again.
 */
export function useBookingsTab() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const asked = params.get('tab');
  const tab: BookingTab = TABS.find((t) => t === asked) ?? 'upcoming';
  const setTab = (next: string) => {
    const qs = new URLSearchParams(params.toString());
    // The open panel belongs to a row on the tab being left. Keeping it would
    // strand it with nothing highlighted, and once that tab's cache is dropped
    // the app would refetch a booking it had already shown.
    qs.delete('booking');
    // Upcoming is the default, so it stays out of the URL; anything else that
    // was on the link (utm_*) survives the change.
    if (next === 'pending' || next === 'history') qs.set('tab', next);
    else qs.delete('tab');
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  return { tab, setTab };
}
