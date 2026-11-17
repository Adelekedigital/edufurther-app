import { csvFilename, downloadCsv, toCsv, type CsvColumn } from './csv';

type Row = { name: string; n: number | null; note?: string };
const cols: CsvColumn<Row>[] = [
  { header: 'Name', value: (r) => r.name },
  { header: 'Count', value: (r) => r.n },
  { header: 'Note', value: (r) => r.note },
];
const body = (csv: string) => csv.slice(1); // past the byte-order mark

describe('toCsv', () => {
  it('starts with a byte-order mark and ends every line CRLF (RFC 4180)', () => {
    const csv = toCsv(cols, [{ name: 'Ada', n: 3 }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(body(csv)).toBe('Name,Count,Note\r\nAda,3,\r\n');
  });

  it('quotes a cell holding a comma, a quote or a line break, doubling its quotes', () => {
    const csv = toCsv(cols, [{ name: 'Okafor, Ada', n: 1, note: 'said "hi"\nthen left' }]);
    expect(body(csv).split('\r\n')[1]).toBe('"Okafor, Ada",1,"said ""hi""\nthen left"');
  });

  it('keeps typed text that starts like a formula as text (CSV injection)', () => {
    const rows = ['=HYPERLINK("x")', '+1', '-2', '@SUM(A1)', '\tx'].map((note) => ({
      name: 'A',
      n: null,
      note,
    }));
    const notes = body(toCsv(cols, rows))
      .split('\r\n')
      .slice(1, -1)
      .map((l) => l.split(',').slice(2).join(','));
    expect(notes).toEqual(['"\'=HYPERLINK(""x"")"', "'+1", "'-2", "'@SUM(A1)", "'\tx"]);
  });

  it('leaves our own numbers as numbers, a negative one included; empty for none', () => {
    const csv = toCsv(cols, [
      { name: 'A', n: -4 },
      { name: 'B', n: null },
    ]);
    expect(body(csv).split('\r\n').slice(1, 3)).toEqual(['A,-4,', 'B,,']);
  });

  it('just the header row when there are no rows', () => {
    expect(body(toCsv(cols, []))).toBe('Name,Count,Note\r\n');
  });
});

describe('csvFilename', () => {
  it('slugs each part and dates it', () => {
    expect(csvFilename(['Mentors', 'Not approved'], '2026-11-17')).toBe(
      'edufurther-mentors-not-approved-2026-11-17.csv',
    );
  });
});

describe('downloadCsv', () => {
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  afterEach(() => {
    vi.restoreAllMocks();
    Object.assign(URL, { createObjectURL: original.create, revokeObjectURL: original.revoke });
  });

  it('hands the browser a UTF-8 CSV under the given name', async () => {
    const create = vi.fn((_b: Blob) => 'blob:csv');
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadCsv('x.csv', cols, [{ name: 'Ada', n: 1 }]);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('x.csv');
    const blob = create.mock.calls[0]![0];
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(await blob.text()).toContain('Ada,1,');
  });
});
