import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const get = vi.fn();
vi.mock('./http', () => ({ api: { GET: (...a: unknown[]) => get(...a) } }));
vi.mock('./session', () => ({
  useSession: () => ({ status: 'absent' }),
  sessionKey: () => 'guest',
}));

const { SIMILAR_SHOWN, useSimilarMentors } = await import('./similar');

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const row = (n: number) => ({
  id: `m${n}`,
  slug: `mentor-${n}`,
  first_name: `Mentor${n}`,
  last_name: 'Okafor',
  cover_art: 'none',
  degree: 'MSc',
  study_course: null,
  institution: 'University of Toronto',
  taking_bookings: true,
  completed_sessions: 4,
  review_count: 0,
  session_value: null,
  next_available_state: 'open',
  next_available_at: '2026-10-03T09:00:00Z',
  joined_at: '2026-09-01T12:00:00Z',
  shared_offering: { slug: 'visa-and-interview', display_name: 'Visa and interview' },
});

describe('useSimilarMentors', () => {
  it('keeps every suggestion the API sends (up to five): each place takes its own count', async () => {
    get.mockResolvedValueOnce({
      data: { data: [1, 2, 3, 4, 5].map(row), next_cursor: null },
      response: { status: 200 },
    });
    const { result } = renderHook(() => useSimilarMentors('gbenga', true), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(5));
    expect(result.current.data![4]!.mentor.profileHref).toBe('/mentors/mentor-5');
  });

  it('the design’s counts: three in the aside, four on the “isn’t available” page', () => {
    expect(SIMILAR_SHOWN).toEqual({ aside: 3, missing: 4 });
  });
});
