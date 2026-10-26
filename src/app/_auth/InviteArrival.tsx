'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { useSession } from '@/lib/api/data/session';
import { INVITE_COPY } from '@/lib/copy/auth';
import { clearInviteCode, rememberInviteCode } from '@/lib/utils/inviteCode';
import { useHydrated } from '@/lib/utils/useHydrated';

/**
 * `/invite/{code}` (issue 281): a guest's invite is remembered for the visit,
 * before any sign-in, then sign-up opens; the sign-in screen names the
 * inviter and the new account claims it. A code that fails the backend's test
 * is dropped, and sign-up still opens. A signed-in member goes home and
 * nothing is remembered: an existing account never claims.
 */
export function InviteArrival({ code }: { code: string }) {
  const session = useSession();
  const router = useRouter();
  // Rendered empty (server and first paint), then filled once a guest is
  // known: a region inserted with its words is often not read.
  const hydrated = useHydrated();
  const said = hydrated && session.status === 'none' ? { text: INVITE_COPY.opening, id: 1 } : null;
  useEffect(() => {
    if (session.status === 'unknown') return;
    if (session.status === 'present') {
      router.replace('/');
      return;
    }
    // The newest link wins: an invalid one leaves no older invite behind.
    if (!rememberInviteCode(code)) clearInviteCode();
    router.replace('/signup');
  }, [session.status, code, router]);
  return (
    <main>
      <LiveRegion message={said} />
    </main>
  );
}
