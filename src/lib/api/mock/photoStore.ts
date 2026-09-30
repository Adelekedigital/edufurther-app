/**
 * MOCK store for the owner's uploaded profile photo (POST /users/{id}/avatar),
 * served by /api/mock/photos/{id}. In memory on globalThis; resets on restart.
 * ENABLE_MOCK_API=1 only.
 */
type Photo = { bytes: ArrayBuffer; type: string; version: number };

const g = globalThis as typeof globalThis & { __mockPhotos?: Map<string, Photo> };
const store = (g.__mockPhotos ??= new Map());

export const mockPhoto = (userId: string): Photo | undefined => store.get(userId);
export function setMockPhoto(userId: string, bytes: ArrayBuffer, type: string) {
  store.set(userId, { bytes, type, version: (store.get(userId)?.version ?? 0) + 1 });
}
export function mockPhotoUrl(userId: string): string | null {
  const p = store.get(userId);
  return p ? `/api/mock/photos/${encodeURIComponent(userId)}?v=${p.version}` : null;
}
/** The mock's "detected face": a little above centre, like most portraits. */
export const MOCK_PHOTO_FOCUS = { x: 0.5, y: 0.35 };
