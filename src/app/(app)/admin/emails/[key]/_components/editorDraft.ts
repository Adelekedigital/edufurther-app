import type { EmailDetail, EmailLineError, EmailVariant } from '@/lib/api/data/adminEmails';
import { EMAIL_EDITOR as C } from '@/lib/copy/adminEmails';
import {
  checkLine,
  fillSample,
  LINE_KEYS,
  LINE_LIMITS,
  lengthWarning,
  valueNames,
  type LineError,
  type LineKey,
} from '@/lib/utils/emailLines';

/**
 * One drafted line: its text, and the version it was read at when the admin
 * started changing it. Save sends that version, so a save made after someone
 * else's (even once a background refetch has brought theirs in) is a 409,
 * never a silent overwrite.
 */
export type DraftLine = { text: string; version: number };
/** One variant's unsaved lines. A line absent here is as saved. */
export type Draft = Partial<Record<LineKey, DraftLine>>;

/** The lines a variant has, in the editor's order. */
export const linesOf = (v: EmailVariant): LineKey[] => LINE_KEYS.filter((l) => v.lines[l]);

export const textOf = (v: EmailVariant, draft: Draft, l: LineKey) =>
  draft[l]?.text ?? v.lines[l]?.text ?? '';

/** A draft entry for new text, keeping the version the line was first read at. */
export const draftLine = (v: EmailVariant, draft: Draft, l: LineKey, text: string): DraftLine => ({
  text,
  version: draft[l]?.version ?? v.lines[l]!.version,
});

/** The line's text differs from what's saved. */
export const lineMoved = (v: EmailVariant, draft: Draft, l: LineKey) =>
  draft[l] !== undefined && draft[l]!.text !== v.lines[l]!.text;

/** Unsaved: a line's text moved, or a changed default was acknowledged (Keep my edit). */
export const isDirty = (v: EmailVariant, draft: Draft, kept: readonly LineKey[]) =>
  kept.length > 0 || linesOf(v).some((l) => lineMoved(v, draft, l));

/**
 * Every line's first problem. `known` is the whole catalogue, or null while
 * it hasn't loaded: then a value this email doesn't carry reads "isn't sent
 * with", the one thing that's certain (the server checks again on save).
 */
export function lineErrors(
  email: EmailDetail,
  v: EmailVariant,
  draft: Draft,
  known: readonly string[] | null,
): Partial<Record<LineKey, LineError>> {
  const carried = email.values.map((x) => x.name);
  const out: Partial<Record<LineKey, LineError>> = {};
  for (const l of linesOf(v)) {
    const text = textOf(v, draft, l);
    const err = checkLine(text, l, known ?? [...carried, ...valueNames(text)], carried);
    if (err) out[l] = err;
  }
  return out;
}

export function errorText(err: LineError | EmailLineError, l: LineKey, emailName: string) {
  switch (err.code) {
    case 'empty':
      return C.errors.empty(C.lines[l]);
    case 'too_long':
      return C.errors.tooLong(LINE_LIMITS[l].max);
    case 'unknown_value':
      return C.errors.unknown(err.value, err.suggestion);
    case 'value_not_sent':
      return C.errors.notSent(err.value, emailName);
  }
}

/** The line as sent with this variant's sample data. */
export const asSent = (v: EmailVariant, text: string) =>
  fillSample(text, v.sample, Object.keys(v.sample));

/** A length warning's words, or null (shown only while the line has no error). */
export function warningText(l: LineKey, sent: string): string | null {
  const w = lengthWarning(l, sent.length);
  return w ? C.warnings[l][w] || null : null;
}

/** What Save sends: every line of the variant, a drafted line with the version it was read at. */
export function savePayload(v: EmailVariant, draft: Draft, kept: readonly LineKey[]) {
  return {
    variant: v.id,
    lines: Object.fromEntries(
      linesOf(v).map((l) => [
        l,
        { text: textOf(v, draft, l), version: draft[l]?.version ?? v.lines[l]!.version },
      ]),
    ) as Record<LineKey, { text: string; version: number }>,
    keepEdit: [...kept],
  };
}
