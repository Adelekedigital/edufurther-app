/**
 * PHASE A MOCK: the design's suggestion list (Mentor Onboarding.dc.html `UNIS`),
 * with ISO countries. Shared by the /institutions search and the goal's
 * schools. ENABLE_MOCK_API=1 only.
 */
const ROWS: [name: string, code: string, country: string][] = [
  ['University of Lagos', 'NG', 'Nigeria'],
  ['University of Ibadan', 'NG', 'Nigeria'],
  ['Obafemi Awolowo University', 'NG', 'Nigeria'],
  ['University of Ghana', 'GH', 'Ghana'],
  ['University of Nairobi', 'KE', 'Kenya'],
  ['Mississippi State University', 'US', 'United States'],
  ['University of Toronto', 'CA', 'Canada'],
  ['University College London', 'GB', 'United Kingdom'],
  ['University of Oxford', 'GB', 'United Kingdom'],
];

export const MOCK_INSTITUTIONS = ROWS.map(([name, code, country], i) => ({
  id: `inst-${i + 1}`,
  name,
  code,
  country,
}));

export const mockInstitutionName = (id: string | null | undefined) =>
  MOCK_INSTITUTIONS.find((i) => i.id === id)?.name ?? null;
