/**
 * The shared dropdown's own words (atoms/Select, PRD fix 9). A caller with a
 * remote list passes its own (e.g. the school search strings); these are the
 * defaults. Reviewed with edufurther-ux-writer (2026-10-26).
 */
export const SELECT_COPY = {
  /** The last row when the typed text matches no row exactly (allowCustom). */
  useTyped: (typed: string) => `Use “${typed}”`,
  searching: 'Searching…',
  failed: 'We couldn’t load this list.',
  retry: 'Try again',
  noMatch: (typed: string) => `No matches for “${typed}”.`,
  /** Heard after each keystroke in a searchable list. */
  count: (n: number) => (n === 1 ? '1 match' : `${n} matches`),
};

export type SelectCopy = Partial<typeof SELECT_COPY>;
