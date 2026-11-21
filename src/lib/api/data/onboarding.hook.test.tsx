import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { NOT_SURE } from '@/lib/copy/onboarding';
import type { UserRead } from './me';
import { useSaveOnboarding } from './onboarding';
import { cachedViewer, meEntry, seedMe } from './_test/meEntry';

const ok = () => Promise.resolve({ response: new Response(null, { status: 200 }) });
vi.mock('./http', () => ({ api: { PATCH: () => ok(), PUT: () => ok(), POST: () => ok() } }));

const countries = [{ id: 'c-ng', label: 'Nigeria', code: 'NG' }];
const levels = [{ id: 'dl-masters', code: 'masters' }];
/** The session's user id, which keys the one /me (me.ts). */
const AUTH = 'auth-1';

describe('useSaveOnboarding: completion', () => {
  it('marks the cached viewer finished, so the setup lock lifts before /me comes back', async () => {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    // A mentee mid-onboarding, in the one /me.
    seedMe(
      qc,
      AUTH,
      meEntry({
        id: 'u1',
        first_name: 'Ada',
        goal: {} as UserRead['goal'],
        onboarding: { complete: false } as UserRead['onboarding'],
      }),
    );
    expect(cachedViewer(qc, AUTH)).toMatchObject({ onboardingComplete: false });
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
    expect(cachedViewer(qc, AUTH)).toMatchObject({ onboardingComplete: true });
  });
});
