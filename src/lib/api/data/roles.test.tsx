import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';
import { useRememberMentorSignup } from './roles';

const PATCH = vi.fn();
vi.mock('./http', () => ({ api: { PATCH: (...a: unknown[]) => PATCH(...a) } }));

const member = (over: Partial<Extract<Viewer, { kind: 'member' }>> = {}) =>
  ({
    kind: 'member',
    id: 'u1',
    isMentor: false,
    isMentee: false,
    hasMentorProfile: false,
    signedUpAsMentor: false,
    ...over,
  }) as Viewer;

function setup(viewer: Viewer, hint: string | null) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useRememberMentorSignup(viewer, hint), { wrapper });
}

beforeEach(() => {
  PATCH.mockReset();
  PATCH.mockResolvedValue({ response: new Response(null, { status: 204 }) });
});

describe('useRememberMentorSignup', () => {
  it('a mentor sign-up with no mentor profile: primary_role mentor, once', async () => {
    const { result, rerender } = setup(member(), 'mentor');
    expect(result.current).toBe(true);
    await waitFor(() => expect(PATCH).toHaveBeenCalledOnce());
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: 'u1' } },
      body: { primary_role: 'mentor' },
    });
    rerender();
    expect(PATCH).toHaveBeenCalledOnce();
  });

  it('nothing to remember: no query, already remembered, a mentor already, or a guest', () => {
    setup(member(), null);
    setup(member({ signedUpAsMentor: true }), 'mentor');
    setup(member({ isMentor: true }), 'mentor');
    setup({ kind: 'guest' }, 'mentor');
    setup(member(), 'mentee');
    expect(PATCH).not.toHaveBeenCalled();
  });

  it('never re-roles a settled account: a mentee, or a declined applicant who chose mentee', () => {
    setup(member({ isMentee: true }), 'mentor');
    setup(member({ hasMentorProfile: true }), 'mentor');
    expect(PATCH).not.toHaveBeenCalled();
  });

  it('a failed save stops the wait, so the page routes on the query', async () => {
    PATCH.mockRejectedValueOnce(new Error('offline'));
    const { result } = setup(member(), 'mentor');
    expect(result.current).toBe(true);
    await waitFor(() => expect(result.current).toBe(false));
  });
});
