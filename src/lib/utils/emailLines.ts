/**
 * The rules for an email's three editable lines (PRD 28 "How: rules"). The
 * editor checks with these as the admin types and on Save; the mock API
 * checks with the same ones, as the backend does on every save.
 */

export type LineKey = 'subject' | 'heading' | 'button';
export const LINE_KEYS: readonly LineKey[] = ['subject', 'heading', 'button'];

/** Characters. `aim` counts the line as sent; `max` counts the raw text. */
export const LINE_LIMITS: Record<LineKey, { min?: number; aim: number; max: number }> = {
  subject: { min: 20, aim: 60, max: 100 },
  heading: { aim: 60, max: 90 },
  button: { aim: 25, max: 32 },
};

/** The unread email's variants are cases, not recipients ("Which case", not "Who gets it"). */
export const VARIANT_CASES: readonly string[] = ['one_message', 'two_from_one', 'two_from_two'];

/** Names the lines themselves fill: never allowed inside one (backend LINE_NAMES). */
export const LINE_NAMES = ['emailSubject', 'emailHeading', 'buttonLabel', 'buttonUrl'];

export type LineError =
  | { code: 'empty' }
  | { code: 'too_long' }
  | { code: 'unknown_value'; value: string; suggestion?: string }
  | { code: 'value_not_sent'; value: string };

/** Every `{name}` in the text, in order (what the backend's PLACEHOLDER finds, and more). */
export const valueNames = (text: string) =>
  (text.match(/\{[^{}]*\}/g) ?? []).map((t) => t.slice(1, -1));

/**
 * The first thing wrong with a line, or null. `known` is every value in the
 * catalogue; `carried` is what this email sends.
 */
export function checkLine(
  text: string,
  line: LineKey,
  known: readonly string[],
  carried: readonly string[],
): LineError | null {
  if (!text.trim()) return { code: 'empty' };
  if (text.length > LINE_LIMITS[line].max) return { code: 'too_long' };
  for (const value of valueNames(text)) {
    if (LINE_NAMES.includes(value) || !known.includes(value)) {
      const near = known.find(
        (k) => k.toLowerCase() === value.toLowerCase() && !LINE_NAMES.includes(k),
      );
      return near
        ? { code: 'unknown_value', value, suggestion: near }
        : { code: 'unknown_value', value };
    }
    if (!carried.includes(value)) return { code: 'value_not_sent', value };
  }
  return null;
}

/** The line as sent with sample data; a value it can't fill stays as `{name}`. */
export function fillSample(
  text: string,
  sample: Readonly<Record<string, string>>,
  carried: readonly string[],
): string {
  return text.replace(/\{([^{}]*)\}/g, (whole, name: string) =>
    carried.includes(name) && sample[name] != null ? sample[name]! : whole,
  );
}

/** Too short or too long as sent; a warning, never a block. */
export function lengthWarning(line: LineKey, asSent: number): 'short' | 'long' | null {
  const { min, aim } = LINE_LIMITS[line];
  if (min && asSent < min) return 'short';
  return asSent > aim ? 'long' : null;
}
