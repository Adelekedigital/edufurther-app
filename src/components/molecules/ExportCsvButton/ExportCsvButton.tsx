'use client';

import { Button, type ButtonSize } from '@/components/atoms/Button/Button';
import { downloadCsv, type CsvColumn } from '@/lib/utils/csv';

type ExportCsvButtonProps<T> = {
  /** e.g. `csvFilename(['mentors', 'approved'], day)`: what the file holds, dated. */
  filename: string;
  columns: readonly CsvColumn<T>[];
  /** The rows to export: what the person has on screen, filters applied. */
  rows: readonly T[];
  label?: string;
  size?: ButtonSize;
  /** After the file is handed to the browser, e.g. to count the export. */
  onExported?: (count: number) => void;
};

/**
 * Export a list as a CSV made on the device (lib/utils/csv): admin lists,
 * a mentor's own dashboard, an analytics table. The page decides which rows
 * and columns; this only builds the file and hands it to the browser.
 * Render it only when there are rows: an empty file helps no one.
 */
export function ExportCsvButton<T>({
  filename,
  columns,
  rows,
  label = 'Export CSV',
  size = 'small',
  onExported,
}: ExportCsvButtonProps<T>) {
  return (
    <Button
      variant="secondary-outlined"
      size={size}
      icon="download"
      onClick={() => {
        downloadCsv(filename, columns, rows);
        onExported?.(rows.length);
      }}
    >
      {label}
    </Button>
  );
}
