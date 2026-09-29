'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { MentorProfile } from '@/types/mentor';

type Options = {
  profile: MentorProfile | null;
  /** Everything else is known: who's looking (so whether they can book). */
  ready: boolean;
  /** This viewer may book this mentor now (not the owner, can book, taking bookings). */
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
export function useBookLink({ profile, ready, allowed, open }: Options) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const asked = params.get('book');
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!asked || !ready || !profile || handled.current === asked) return;
    handled.current = asked;
    if (allowed && profile.sessionTypes.some((t) => t.id === asked)) open(asked);
    const next = new URLSearchParams(params.toString());
    next.delete('book');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [asked, ready, profile, allowed, open, params, pathname, router]);
}
