import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';
import { keys } from './keys';
import { useMarkApprovedSeen, type MentorApplication } from './mentorApplicationStatus';

// Mentor onboarding on, before access.ts reads it.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED = 'true';
});
const { accessFor } = await import('@/lib/utils/access');

const POST = vi.fn();
vi.mock('./http', () => ({ api: { POST: (...a: unknown[]) => POST(...a) } }));

const person = { firstName: 'Gbenga', fullName: 'Gbenga Ekundayo', email: 'g@example.com' };
const KEY = keys.viewer.mentorApplication('u1');

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  qc.setQueryData<MentorApplication>(KEY, {
    stage: 'approved',
    seen: false,
    ...person,
  } as MentorApplication);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useMarkApprovedSeen('u1'), { wrapper });
  return { qc, result };
}

describe('useMarkApprovedSeen (PRD B3)', () => {
  beforeEach(() => POST.mockReset());

  it('marks the cached read seen, so coming back in the same visit skips the screen', async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 200 }) });
    const { qc, result } = setup();
    result.current.markSeen();
    await waitFor(() => expect(qc.getQueryData(KEY)).toMatchObject({ seen: true }));
    expect(POST).toHaveBeenCalledWith('/api/v1/me/mentor-application/approved-seen');
  });

  it('a 409 (not approved after all) is no error', async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 409 }), error: {} });
    const { qc, result } = setup();
    result.current.markSeen();
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(qc.getMutationCache().getAll()[0]?.state.status).toBe('success');
  });

  it('a 5xx leaves the read unseen, so the next visit shows the screen again', async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 503 }), error: {} });
    const { qc, result } = setup();
    result.current.markSeen();
    await waitFor(() => expect(qc.getMutationCache().getAll()[0]?.state.status).toBe('error'));
    expect(qc.getQueryData(KEY)).toMatchObject({ seen: false });
  });
});

describe('useMarkApprovedSeen: the viewer follows', () => {
  beforeEach(() => POST.mockReset());

  it('marks the cached viewer seen, so Home goes back to the dashboard (no repeat toast)', async () => {
    POST.mockResolvedValue({ response: new Response(null, { status: 200 }) });
    const { qc, result } = setup();
    const ME = keys.viewer.me('u1');
    qc.setQueryData(ME, {
      kind: 'member',
      id: 'u1',
      firstName: 'Gbenga',
      initial: 'G',
      isMentee: false,
      isApprovedMentor: true,
      isMentor: true,
      completedSessions: 0,
      credits: null,
      mentorStage: 'approved',
      mentorApprovedSeen: false,
    } as Viewer);
    expect(accessFor(qc.getQueryData<Viewer>(ME)!).homeHref).toBe('/mentor-application');
    result.current.markSeen();
    await waitFor(() => expect(qc.getQueryData(ME)).toMatchObject({ mentorApprovedSeen: true }));
    expect(accessFor(qc.getQueryData<Viewer>(ME)!).homeHref).toBeNull();
  });
});
