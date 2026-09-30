/**
 * MOCK catalogs for the owner's background editor (GET /catalog/countries,
 * /catalog/languages) and the store its saves write to. ENABLE_MOCK_API=1 only.
 * Ids are stable strings here; the real ones are uuids.
 */
type Row = { id: string; code: string; display_name: string };

export const MOCK_COUNTRIES: Row[] = [
  ['c-cm', 'CM', 'Cameroon'],
  ['c-ca', 'CA', 'Canada'],
  ['c-de', 'DE', 'Germany'],
  ['c-gh', 'GH', 'Ghana'],
  ['c-ke', 'KE', 'Kenya'],
  ['c-ng', 'NG', 'Nigeria'],
  ['c-za', 'ZA', 'South Africa'],
  ['c-gb', 'GB', 'United Kingdom'],
  ['c-us', 'US', 'United States'],
].map(([id, code, display_name]) => ({ id: id!, code: code!, display_name: display_name! }));

/** `common`: the short list shown before the owner types (backend `common=true`). */
export const MOCK_LANGUAGES: (Row & { common: boolean })[] = [
  ['af', 'Afrikaans', false],
  ['am', 'Amharic', true],
  ['ar', 'Arabic', true],
  ['en', 'English', true],
  ['fr', 'French', true],
  ['ha', 'Hausa', true],
  ['ig', 'Igbo', true],
  ['rw', 'Kinyarwanda', false],
  ['ln', 'Lingala', false],
  ['pcm', 'Nigerian Pidgin', true],
  ['pt', 'Portuguese', true],
  ['sn', 'Shona', false],
  ['so', 'Somali', false],
  ['es', 'Spanish', true],
  ['sw', 'Swahili', true],
  ['tw', 'Twi', true],
  ['wo', 'Wolof', false],
  ['xh', 'Xhosa', false],
  ['yo', 'Yoruba', true],
  ['zu', 'Zulu', true],
].map(([id, display_name, common]) => ({
  id: id as string,
  code: id as string,
  display_name: display_name as string,
  common: common as boolean,
}));

export const countryIdByName = (name: string | null) =>
  MOCK_COUNTRIES.find((c) => c.display_name === name)?.id ?? null;
export const countryName = (id: string | null) =>
  MOCK_COUNTRIES.find((c) => c.id === id)?.display_name ?? null;

/** What the owner saved from the profile's editors; unset keys keep the fixture's. */
export type MockItems = {
  origin_country_id?: string | null;
  primary_study_country_id?: string | null;
  language_ids?: string[];
  offering_ids?: string[];
};
const g = globalThis as typeof globalThis & { __mockItems?: Map<string, MockItems> };
const store = (g.__mockItems ??= new Map());
export const mockItems = (userId: string): MockItems => store.get(userId) ?? {};
export const setMockItems = (userId: string, next: MockItems) =>
  store.set(userId, { ...mockItems(userId), ...next });
