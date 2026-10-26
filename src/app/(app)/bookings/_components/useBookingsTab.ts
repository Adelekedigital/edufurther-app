'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { HISTORY_FILTERS } from '@/lib/utils/bookings';
import type { BookingStatus, BookingTab } from '@/types/booking';

const TABS: BookingTab[] = ['upcoming', 'pending', 'history'];

/**
 * Which tab is showing, kept in the URL (`?tab=`) as the profile's is. The nav
 * badge sends people here to answer a request, so "Bookings, pending" has to be
 * a link someone can be sent — and Back has to come out of History again.
 *
 * `?filter=missed` (Mentee Home's "View missed") is a link into History with
 * that chip on, so it opens History even without `tab=history`. It's only the
 * way in: the first chip change or tab change drops it, so a reload keeps the
 * viewer's own choice.
 */
export function useBookingsTab() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const linkedFilter = HISTORY_FILTERS.find((f) => f.key === params.get('filter')) ?? null;
  const asked = params.get('tab');
  const tab: BookingTab = TABS.find((t) => t === asked) ?? (linkedFilter ? 'history' : 'upcoming');

  const replaceWith = (edit: (qs: URLSearchParams) => void) => {
    const qs = new URLSearchParams(params.toString());
    edit(qs);
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  const setTab = (next: string) =>
    replaceWith((qs) => {
      // The open panel belongs to a row on the tab being left. Keeping it would
      // strand it with nothing highlighted, and once that tab's cache is dropped
      // the app would refetch a booking it had already shown.
      qs.delete('booking');
      qs.delete('filter');
      // Upcoming is the default, so it stays out of the URL; anything else that
      // was on the link (utm_*) survives the change.
      if (next === 'pending' || next === 'history') qs.set('tab', next);
      else qs.delete('tab');
    });
  /** Called on a chip change: the link's filter has done its job. */
  const dropLinkedFilter = () => {
    if (!params.has('filter')) return;
    replaceWith((qs) => {
      qs.delete('filter');
      if (tab === 'history') qs.set('tab', 'history');
    });
  };
  const initialFilters: BookingStatus[] = linkedFilter?.statuses ?? [];
  return { tab, setTab, initialFilters, dropLinkedFilter };
}
