import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';

/**
 * The admin screens' shared test pieces (Mentors, Credits, Emails): a
 * signed-in admin, a generated-client answer, and a render with a fresh query
 * cache. Each test file still mocks `@/lib/api/data/http` and `viewer` itself.
 */
export const admin = (over: object = {}): Viewer =>
  ({
    kind: 'member',
    id: 'admin-1',
    firstName: 'Ada',
    initials: 'AO',
    isMentee: true,
    isApprovedMentor: false,
    isMentor: false,
    completedSessions: 0,
    timeZone: 'UTC',
    isAdmin: true,
    adminRole: 'super_admin',
    ...over,
  }) as Viewer;

/** What the client returns: `data` on success, the whole problem body as `error` on a failure. */
export const res = (data: unknown, status = 200) => ({
  data: status >= 400 ? undefined : data,
  error: status >= 400 ? (data ?? {}) : undefined,
  response: new Response(null, { status }),
});

export function renderScreen(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // The cache too, so a test can refetch as a window focus would.
  return { ...render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>), qc };
}
