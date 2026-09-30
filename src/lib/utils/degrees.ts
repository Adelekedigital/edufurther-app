/** The degree list the education form offers (ProfileItemModal.dc.html). */
export const DEGREES = ['PhD', 'MSc', 'MA', 'MBA', 'MPH', 'MEng', 'BSc', 'BA', 'Other'] as const;

/**
 * The catalog degree level each one sits under (backend reply: the label is
 * the degree abbreviation; the level is derived). "Other": neither is said.
 */
const LEVEL: Record<string, string | null> = {
  PhD: 'phd',
  MSc: 'masters',
  MA: 'masters',
  MPH: 'masters',
  MEng: 'masters',
  MBA: 'mba',
  BSc: 'undergraduate',
  BA: 'undergraduate',
  Other: null,
};

/** The level code for a degree the form offers; undefined for one it doesn't. */
export const levelCodeFor = (degree: string): string | null | undefined => LEVEL[degree];

/** The form's degree for a saved abbreviation: as saved, or "Other" when there's none. */
export const degreeFromSaved = (abbreviation: string | null | undefined) =>
  abbreviation?.trim() || 'Other';

/**
 * A year as the API's date. The form only asks for years (backend: send
 * YYYY-01-01); a saved date keeps its month and day while its year is unchanged.
 */
export function yearToDate(year: number, saved: string | null): string {
  if (saved && Number(saved.slice(0, 4)) === year) return saved;
  return `${year}-01-01`;
}
