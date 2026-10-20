import type { CSSProperties } from 'react';
import { coverFor, type CoverKey } from './cover';

/**
 * One rule for how a person looks wherever a face or initials appear (owner,
 * 2026-10-20): the same initials, the same crop and the same colour for the
 * same person on every screen and for every role.
 */

/** Where the face is in the photo, 0–1 each way (backend `avatar_focus`). */
export type PhotoFocus = { x: number; y: number };

/** avatar_focus → a clamped 0–1 point, or null when absent or malformed. */
export function clampFocus(f: { x: number; y: number } | null | undefined): PhotoFocus | null {
  if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y)) return null;
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  return { x: clamp(f.x), y: clamp(f.y) };
}

/** The crop as the CSS variables every photo reads (`--avatar-x` / `--avatar-y`). */
export function focusVars(focus: PhotoFocus | null | undefined): CSSProperties {
  if (!focus) return {};
  return {
    '--avatar-x': `${(focus.x * 100).toFixed(1)}%`,
    '--avatar-y': `${(focus.y * 100).toFixed(1)}%`,
  } as CSSProperties;
}

/**
 * Two letters, first and last name ("GE"); with only one name, its first
 * letter; with neither, the fallback's first letter (an email, a display
 * name), else "".
 */
export function personInitials(
  first: string | null | undefined,
  last: string | null | undefined,
  fallback?: string | null,
): string {
  const f = first?.trim() ?? '';
  const l = last?.trim() ?? '';
  const two = `${f[0] ?? ''}${l[0] ?? ''}`.toUpperCase();
  if (two) return two;
  return (fallback?.trim()[0] ?? '').toUpperCase();
}

/**
 * The person's colour: their chosen cover, else the one derived from their id
 * (the same hash and order as the profile cover). Initials sit on its deep tone.
 */
export function personCover(id: string, chosen?: CoverKey | null): CoverKey {
  return chosen ?? coverFor(id);
}
