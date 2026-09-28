/**
 * Profile cover colours (Mentor Profile.dc.html, 2026-09-27). Order and keys
 * are the design's: the automatic pick indexes this list, so reordering it
 * changes every mentor's cover. Colours live in tokens (--cover-{key}-bg/-ink).
 */
export const COVER_KEYS = [
  'sky',
  'ice',
  'aqua',
  'mint',
  'sage',
  'lemon',
  'sand',
  'peach',
  'blush',
  'rose',
  'lilac',
  'mist',
] as const;

export type CoverKey = (typeof COVER_KEYS)[number];

/**
 * The automatic cover for a mentor: the design's string hash of the id
 * (h = h * 31 + char, unsigned 32-bit) over the list above. Stable per id.
 * A chosen cover (backend request #19) will override it.
 */
export function coverFor(mentorId: string): CoverKey {
  let h = 0;
  for (let i = 0; i < mentorId.length; i++) h = (h * 31 + mentorId.charCodeAt(i)) >>> 0;
  return COVER_KEYS[h % COVER_KEYS.length]!;
}

/** CSS custom-property values for a cover: banner ground and photo-circle ink. */
export function coverVars(key: CoverKey): { bg: string; ink: string } {
  return { bg: `var(--cover-${key}-bg)`, ink: `var(--cover-${key}-ink)` };
}
