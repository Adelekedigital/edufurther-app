import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';
import { NOT_SURE } from '@/lib/copy/onboarding';
import { keys } from './keys';
import { useSaveOnboarding } from './onboarding';

const ok = () => Promise.resolve({ response: new Response(null, { status: 200 }) });
vi.mock('./http', () => ({ api: { PATCH: () => ok(), PUT: () => ok(), POST: () => ok() } }));

const countries = [{ id: 'c-ng', label: 'Nigeria', code: 'NG' }];
const levels = [{ id: 'dl-masters', code: 'masters' }];
const ME = keys.viewer.me('u1');

describe('useSaveOnboarding: completion', () => {
  it('marks the cached viewer finished, so the setup lock lifts before /me comes back', async () => {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    qc.setQueryData(ME, {
      kind: 'member',
      id: 'u1',
      firstName: 'Ada',
      initials: 'A',
      isMentee: true,
      isApprovedMentor: false,
      isMentor: false,
      completedSessions: 0,
      credits: null,
      onboardingComplete: false,
    } as Viewer);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSaveOnboarding('u1', null, levels, countries), {
      wrapper,
    });
    await result.current.save({
      step: 'plans',
      needIds: ['o1'],
      plans: { originId: 'c-ng', degree: 'mba', field: 'Law', destinationId: NOT_SURE },
    });
    expect(qc.getQueryData(ME)).toMatchObject({ onboardingComplete: true });
  });
});
