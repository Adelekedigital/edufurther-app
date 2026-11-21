'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { replaceQuery } from '@/lib/utils/replaceQuery';

/**
 * Which booking the details panel is showing, kept in the URL (`?booking=`)
 * beside `?tab=`.
 *
 * The design holds it in component state. In the URL it survives a refresh and
 * can be sent to someone — and it is what makes the single-booking read worth
 * having, for a link opened cold.
 */
export function useSelectedBooking() {
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get('booking');

  const select = (id: string | null) => {
    const qs = new URLSearchParams(params.toString());
    if (id) qs.set('booking', id);
    else qs.delete('booking');
    const s = qs.toString();
    // `replace`, not `push`: opening and closing a panel is not somewhere to
    // go Back to, and the row that opened it is still on screen.
    replaceQuery(s ? `${pathname}?${s}` : pathname);
  };

  return { selected, select, toggle: (id: string) => select(selected === id ? null : id) };
}
