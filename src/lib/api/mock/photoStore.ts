/**
 * MOCK store for the owner's uploaded profile photo (POST /users/{id}/avatar),
 * served by /api/mock/photos/{id}. In memory on globalThis; resets on restart.
 * ENABLE_MOCK_API=1 only.
 */
type Photo = { bytes: ArrayBuffer; type: string; version: number };

const g = globalThis as typeof globalThis & {
  __mockPhotos?: Map<string, Photo>;
  __mockPhotosRemoved?: Set<string>;
};
const store = (g.__mockPhotos ??= new Map());
// Owners who removed their photo (DELETE /users/{id}/avatar): no photo at all,
// not the fixture's sample.
const removed = (g.__mockPhotosRemoved ??= new Set());

export const mockPhoto = (userId: string): Photo | undefined => store.get(userId);
export function setMockPhoto(userId: string, bytes: ArrayBuffer, type: string) {
  removed.delete(userId);
  store.set(userId, { bytes, type, version: (store.get(userId)?.version ?? 0) + 1 });
}
export function removeMockPhoto(userId: string) {
  store.delete(userId);
  removed.add(userId);
}
export const mockPhotoRemoved = (userId: string) => removed.has(userId);
export function mockPhotoUrl(userId: string): string | null {
  const p = store.get(userId);
  return p ? `/api/mock/photos/${encodeURIComponent(userId)}?v=${p.version}` : null;
}
/** The mock's "detected face": a little above centre, like most portraits. */
export const MOCK_PHOTO_FOCUS = { x: 0.5, y: 0.35 };
