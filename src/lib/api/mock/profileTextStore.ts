/**
 * MOCK store for the owner's names and About (PATCH /users/{id}/profile).
 * In memory on globalThis, so route modules share it; resets on restart.
 * ENABLE_MOCK_API=1 only.
 */
export type MockText = { first_name?: string; last_name?: string; about_me?: string | null };

const g = globalThis as typeof globalThis & { __mockText?: Map<string, MockText> };
const store = (g.__mockText ??= new Map());

export const mockText = (userId: string): MockText => store.get(userId) ?? {};
export const setMockText = (userId: string, next: MockText) =>
  store.set(userId, { ...mockText(userId), ...next });
