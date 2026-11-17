'use client';

import { Button, type ButtonSize } from '@/components/atoms/Button/Button';
import { downloadCsv, type CsvColumn } from '@/lib/utils/csv';

type ExportCsvButtonProps<T> = {
  /**
   * What the file holds, dated: e.g. `() => csvFilename(['mentors', 'approved'], today)`.
   * A function is read at the click, so a page left open overnight names today.
   */
  filename: string | (() => string);
  columns: readonly CsvColumn<T>[];
  /** The rows to export: what the person has on screen, filters applied. */
  rows: readonly T[];
  label?: string;
  /** Why it's off while there are no rows, e.g. "No mentors on screen to export". */
  emptyReason?: string;
  size?: ButtonSize;
  /** After the file is handed to the browser, e.g. to count the export. */
  onExported?: (count: number) => void;
};

/**
 * Export a list as a CSV made on the device (lib/utils/csv): admin lists,
 * a mentor's own dashboard, an analytics table. The page decides which rows
 * and columns; this builds the file and hands it to the browser.
 *
 * With no rows it stays put but unavailable (aria-disabled, focus kept,
 * `emptyReason` says why): a list that empties after a refresh never takes
 * the focused control away and drops the person to the top of the page.
 */
export function ExportCsvButton<T>({
  filename,
  columns,
  rows,
  label = 'Export CSV',
  emptyReason,
  size = 'small',
  onExported,
}: ExportCsvButtonProps<T>) {
  const empty = rows.length === 0;
  return (
    <Button
      variant="secondary-outlined"
      size={size}
      icon="download"
      unavailable={empty}
      title={empty ? emptyReason : undefined}
      onClick={() => {
        if (empty) return;
        downloadCsv(typeof filename === 'function' ? filename() : filename, columns, rows);
        onExported?.(rows.length);
      }}
    >
      {label}
    </Button>
  );
}
