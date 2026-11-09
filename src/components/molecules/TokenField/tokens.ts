import { norm } from '@/components/atoms/Select/typeahead';

/** A value the field may hold, written `{name}` in the text. */
export type TokenValue = { name: string; meaning?: string; example?: string };
/** What opens the value list while typing: `/` alone, or `/` and `{`. */
export type TokenTriggers = 'slashAndBrace' | 'slash';

export type Segment = { text: string; kind: 'text' | 'value' | 'unknown' };

/** The text as the mirror draws it: plain runs, known values, unknown values. */
export function segments(text: string, names: readonly string[]): Segment[] {
  return text
    .split(/(\{[^}]*\})/)
    .filter(Boolean)
    .map((t) => {
      if (!/^\{[^}]*\}$/.test(t)) return { text: t, kind: 'text' };
      return { text: t, kind: names.includes(t.slice(1, -1)) ? 'value' : 'unknown' };
    });
}

/** Every `{name}` in the text, in order. */
export function valueNames(text: string): string[] {
  return (text.match(/\{[^}]*\}/g) ?? []).map((t) => t.slice(1, -1));
}

// A trigger counts at the start, or after a space or an opening bracket or quote.
const TRIGGER = {
  slashAndBrace: /(^|[\s(“"'])([/{])([A-Za-z]*)$/,
  slash: /(^|[\s(“"'])(\/)([A-Za-z]*)$/,
} as const;

/** The trigger the caret sits after, with what's been typed since: `{from, query}`. */
export function findTrigger(
  text: string,
  caret: number,
  triggers: TokenTriggers,
): { from: number; query: string } | null {
  const m = text.slice(0, caret).match(TRIGGER[triggers]);
  if (!m) return null;
  const query = m[3] ?? '';
  return { from: caret - query.length - 1, query };
}

/**
 * Puts `{name}` in place of text[from, to). A space goes before it unless it
 * starts the field or follows a space or an opening bracket or quote, and
 * after it unless the next character is a space or closing punctuation.
 */
export function insertValue(
  text: string,
  name: string,
  from: number,
  to: number,
): { text: string; caret: number } {
  const before = text.slice(0, from);
  const after = text.slice(to);
  const lead = before && !/[\s(“"']$/.test(before) ? ' ' : '';
  const trail = after && !/^[\s.,!?:;)”’]/.test(after) ? ' ' : '';
  const ins = `${lead}{${name}}${trail}`;
  return { text: before + ins + after, caret: before.length + ins.length };
}

/** The `{…}` that ends right at the caret, as [start, end). */
export function valueBefore(text: string, caret: number): [number, number] | null {
  if (text[caret - 1] !== '}') return null;
  const start = text.lastIndexOf('{', caret - 1);
  return start < 0 ? null : [start, caret];
}

/** The `{…}` that starts right at the caret, as [start, end). */
export function valueAfter(text: string, caret: number): [number, number] | null {
  if (text[caret] !== '{') return null;
  const close = text.indexOf('}', caret);
  return close < 0 ? null : [caret, close + 1];
}

/** Values whose name or meaning holds the query (case- and accent-insensitive). */
export function matchValues(values: readonly TokenValue[], query: string): TokenValue[] {
  const q = norm(query);
  if (!q) return [...values];
  return values.filter((v) => norm(v.name).includes(q) || norm(v.meaning ?? '').includes(q));
}

/** A pasted or typed line break becomes a space: the field is one line of copy. */
export const oneLine = (text: string) => text.replace(/\r\n|\r|\n/g, ' ');
