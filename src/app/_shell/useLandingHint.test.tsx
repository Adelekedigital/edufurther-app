import { renderHook } from '@testing-library/react';
import { previewStore, resetPreviewStoreForTests } from '@/lib/api/data/previewStore';
import { CHOSE_EXPLORE_COOKIE } from '@/lib/utils/landingHint';
import type { Viewer } from '@/types/mentor';
import { useLandingHint } from './useLandingHint';

const saveLandingHint = vi.fn();
vi.mock('@/lib/api/data/landingHint', () => ({
  saveLandingHint: (...a: unknown[]) => saveLandingHint(...a),
}));
vi.mock('@/lib/api/data/session', () => ({
  useSession: () => ({ status: 'present', userId: 'admin-1' }),
}));
// preview.ts reaches the generated client; nothing here calls it.
vi.mock('@/lib/api/data/http', () => ({ api: {} }));

const mentor = {
  kind: 'member',
  id: 'm-1',
  firstName: 'Tunde',
  initials: 'TB',
  isMentor: true,
  isApprovedMentor: true,
  isMentee: false,
  completedSessions: 0,
} as unknown as Viewer;

const clearCookie = () => {
  document.cookie = `${CHOSE_EXPLORE_COOKIE}=; path=/; max-age=0`;
};

beforeEach(() => {
  saveLandingHint.mockReset();
  clearCookie();
  sessionStorage.clear();
  resetPreviewStoreForTests();
});
afterAll(clearCookie);

describe('useLandingHint', () => {
  it('signed in as themselves: the hint is saved, Explore marked chosen', () => {
    renderHook(() => useLandingHint(mentor, '/explore'));
    expect(saveLandingHint).toHaveBeenCalledWith('admin-1', expect.any(String));
    expect(document.cookie).toContain(`${CHOSE_EXPLORE_COOKIE}=admin-1`);
  });

  it('Preview as user: no hint and no chose-explore cookie (bound to the admin, not them)', () => {
    previewStore.started(
      's-1',
      {
        id: 'm-1',
        email: 'tunde@example.com',
        name: 'Tunde Bello',
        firstName: 'Tunde',
        initials: 'TB',
        role: 'mentor',
      },
      { revealed: false, canReveal: false },
    );
    renderHook(() => useLandingHint(mentor, '/explore'));
    expect(saveLandingHint).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain(CHOSE_EXPLORE_COOKIE);
  });
});
