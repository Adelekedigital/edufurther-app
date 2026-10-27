import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';

/**
 * The Mentors screen's test harness: a signed-in admin, and the generated
 * client answered from the in-app mock store (lib/api/mock/adminMentors).
 * Each test file mocks `@/lib/api/data/http` and `viewer` with these.
 */
export const h = {
  viewer: null as Viewer | null,
  GET: vi.fn(),
  POST: vi.fn(),
};

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

export const res = (data: unknown, status = 200) => ({
  data,
  error: status >= 400 ? { type: (data as { type?: string } | null)?.type } : undefined,
  response: new Response(null, { status }),
});

/** GET answered from the mock store; tests override per path. */
export async function serveFromStore(overrides: Record<string, () => unknown> = {}) {
  const store = await import('@/lib/api/mock/adminMentors');
  h.GET.mockImplementation(async (path: string, init?: { params?: Record<string, never> }) => {
    const p = init?.params as { query?: { tab?: string }; path?: { user_id?: string } } | undefined;
    if (overrides[path]) return overrides[path]!();
    if (path === '/api/v1/admin/mentors/summary') return res(store.mockMentorSummary());
    if (path === '/api/v1/admin/mentors')
      return res({ data: store.mockMentorRows(p?.query?.tab as never, ''), next_cursor: null });
    if (path === '/api/v1/admin/mentors/{user_id}')
      return res(store.mockMentorDetail(p?.path?.user_id ?? ''));
    if (path === '/api/v1/admin/mentors/{user_id}/notes')
      return res({ data: store.mockNotes(p?.path?.user_id ?? ''), next_cursor: null });
    return res(null, 404);
  });
}

export function renderScreen(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}
