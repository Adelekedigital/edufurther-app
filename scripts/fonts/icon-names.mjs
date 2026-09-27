import { createHash } from 'node:crypto';

/** The sorted glyph names in iconNames.ts (ICON_NAMES = [ '…', … ] as const). */
export function iconNamesFromSource(source) {
  const block = source.match(/ICON_NAMES\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1];
  if (!block) throw new Error('ICON_NAMES not found in iconNames.ts');
  return [...block.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]).sort();
}

/**
 * Fingerprint of the committed icon font AND the glyph list written with it, so
 * neither a swapped font nor a hand-edited list can pass check:icons.
 */
export const fingerprint = (font, names) =>
  createHash('sha256')
    .update(font)
    .update(
      `
${names.join(',')}`,
    )
    .digest('hex');
