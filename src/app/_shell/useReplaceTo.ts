'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { keepMockViewer } from '@/lib/utils/mockViewerParam';

/**
 * Replaces the URL with `to` once it is set (null: stay). Every redirect a
 * page makes on the viewer's behalf (the role redirect, the setup detour)
 * goes through here, so a dev `?mockViewer=` survives it.
 */
export function useReplaceTo(to: string | null): void {
  const router = useRouter();
  useEffect(() => {
    if (to) router.replace(keepMockViewer(to));
  }, [to, router]);
}
