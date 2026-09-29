'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { MentorProfile } from '@/types/mentor';

type Options = {
  profile: MentorProfile | null;
  /** No profile to open it on (not found, or it failed): the link is dropped. */
  gone: boolean;
  /**
   * Whether the link can be decided yet: who's looking is known, and the
   * device is online (offline, the link waits instead of opening a modal
   * that can only spin; review of #81).
   */
  ready: boolean;
  /**
   * This viewer may book this mentor now: not the owner, can book, taking
   * bookings, and nothing blocks their booking (account setup: the page's
   * Book already says why; review of #81).
   */
  allowed: boolean;
  open: (sessionTypeId: string) => void;
};

/**
 * `?book={sessionTypeId}` (the link a mentor copies from Session Types): the
 * profile opens with booking on that type. Only for one of the mentor's
 * visible types, and only when the viewer may book; otherwise the page just
 * opens. Either way the parameter is then dropped (other parameters stay), so
 * closing, reloading or Back doesn't bring the modal back.
 */
export function useBookLink({ profile, gone, ready, allowed, open }: Options) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const asked = params.get('book');
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!asked) {
      // Handled and removed: the same link, followed again later, counts again.
      handled.current = null;
      return;
    }
    if (handled.current === asked) return;
    if (!gone && (!ready || !profile)) return;
    handled.current = asked;
    if (!gone && allowed && profile?.sessionTypes.some((t) => t.id === asked)) open(asked);
    const next = new URLSearchParams(params.toString());
    next.delete('book');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [asked, gone, ready, profile, allowed, open, params, pathname, router]);
}
