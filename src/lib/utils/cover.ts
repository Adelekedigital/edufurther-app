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
 * A mentor's chosen cover (`coverKey`) overrides it.
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

/** A stored cover colour, only if it's one of ours (never passed to CSS unchecked). */
export function coverKey(value: unknown): CoverKey | null {
  return typeof value === 'string' && (COVER_KEYS as readonly string[]).includes(value)
    ? (value as CoverKey)
    : null;
}

/** Cover art (backend CoverArt): nothing, topic icons, a dot pattern, or one large icon. */
export type CoverArt = 'none' | 'icons' | 'pattern' | 'single';

export function coverArt(value: unknown): CoverArt {
  return value === 'icons' || value === 'pattern' || value === 'single' ? value : 'none';
}

/**
 * A topic's cover icon (Mentor Profile.dc.html `TM`), matched on the label's
 * words so the catalog's wording can drift; unknown topics get `label`.
 */
export function topicIcon(label: string): CoverIcon {
  const t = label.toLowerCase();
  if (t.includes('visa')) return 'flight_takeoff';
  if (t.includes('scholar') || t.includes('fund') || t.includes('financ')) return 'payments';
  if (t.includes('statement') || t.includes('essay')) return 'edit_document';
  if (t.includes('resume') || t.includes(' cv') || t === 'cv') return 'description';
  if (t.includes('document') || t.includes('application')) return 'folder_open';
  if (t.includes('career') || t.includes('job')) return 'work';
  if (t.includes('school') || t.includes('program') || t.includes('universit')) return 'school';
  return 'label';
}

export type CoverIcon =
  | 'flight_takeoff'
  | 'payments'
  | 'edit_document'
  | 'description'
  | 'folder_open'
  | 'work'
  | 'school'
  | 'label';
