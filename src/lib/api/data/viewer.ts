'use client';

import type { Viewer } from '@/types/mentor';

/**
 * PHASE A MOCK. Auth (Supabase, backend ADRs 0009/0014/0018) is not wired, so
 * the viewer comes from NEXT_PUBLIC_MOCK_VIEWER ("mentee" | "guest").
 * Phase B reads the session instead, and `completedSessions` from
 * `GET /api/v1/me` → `mentee_completed_sessions` (backend reply round 2 #12).
 * The return type does not change.
 */
export function useViewer(): Viewer {
  return process.env.NEXT_PUBLIC_MOCK_VIEWER === 'guest'
    ? { kind: 'guest' }
    : { kind: 'mentee', firstName: 'Esther', initial: 'E', completedSessions: 0 };
}
