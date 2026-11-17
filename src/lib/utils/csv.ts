/**
 * Spreadsheet export for any list: RFC 4180 text that Excel, Google Sheets
 * and Numbers all open, built on the device from rows already on screen.
 */

import { downloadFile } from './download';

/** One column: its header and how a row's cell reads. */
export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

/** Excel reads a file as UTF-8 only when it starts with a byte-order mark. */
const BOM = '﻿';

/**
 * A cell a spreadsheet would run as a formula (OWASP "CSV injection"): text
 * someone typed, like a name or a reason, starting = + - @ or a tab or
 * carriage return. A leading apostrophe keeps it text. Numbers are ours and
 * pass as they are, so a negative number stays a number.
 */
const FORMULA = /^[=+\-@\t\r]/;

function cell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (typeof v === 'string' && FORMULA.test(s)) s = `'${s}`;
  // Quote a cell holding a comma, a quote or a line break; double its quotes.
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The CSV text: a header row, then one row each, CRLF line ends (RFC 4180). */
export function toCsv<T>(columns: readonly CsvColumn<T>[], rows: readonly T[]): string {
  const lines = [
    columns.map((c) => cell(c.header)),
    ...rows.map((r) => columns.map((c) => cell(c.value(r)))),
  ];
  return BOM + lines.map((l) => l.join(',')).join('\r\n') + '\r\n';
}

/**
 * A file name that sorts and says what it holds:
 * `edufurther-mentors-approved-2026-11-17.csv`. `day` is the admin's own date.
 */
export function csvFilename(parts: readonly string[], day: string): string {
  const slug = parts
    .map((p) =>
      p
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    )
    .filter(Boolean)
    .join('-');
  return `edufurther-${slug}-${day}.csv`;
}

/** Builds the CSV and hands it to the browser as a download. */
export function downloadCsv<T>(
  filename: string,
  columns: readonly CsvColumn<T>[],
  rows: readonly T[],
): void {
  downloadFile(filename, toCsv(columns, rows), 'text/csv;charset=utf-8');
}
