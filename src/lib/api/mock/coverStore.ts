import { COVER_KEYS } from '@/lib/utils/cover';

/**
 * MOCK store for the owner's cover (PATCH /users/{id}/profile cover fields,
 * POST /users/{id}/banner). In memory on globalThis, so the route modules
 * share it; it resets when the server restarts. ENABLE_MOCK_API=1 only.
 */
export type MockCover = {
  cover_color: (typeof COVER_KEYS)[number] | null;
  cover_art: 'none' | 'icons' | 'pattern' | 'single';
  banner?: { bytes: ArrayBuffer; type: string; version: number };
};

const g = globalThis as typeof globalThis & { __mockCovers?: Map<string, MockCover> };
const store = (g.__mockCovers ??= new Map());

export function mockCover(userId: string): MockCover {
  return store.get(userId) ?? { cover_color: null, cover_art: 'none' };
}

export function setMockCover(userId: string, next: Partial<MockCover>): MockCover {
  const merged = { ...mockCover(userId), ...next };
  store.set(userId, merged);
  return merged;
}

/** Where the mock serves an uploaded banner; the version busts the image cache. */
export function mockBannerUrl(userId: string): string | null {
  const b = mockCover(userId).banner;
  return b ? `/api/mock/banners/${encodeURIComponent(userId)}?v=${b.version}` : null;
}

export const MOCK_ARTS = ['none', 'icons', 'pattern', 'single'] as const;
