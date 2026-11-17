import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportCsvButton } from './ExportCsvButton';

type Row = { name: string; sessions: number };
const columns = [
  { header: 'Name', value: (r: Row) => r.name },
  { header: 'Sessions', value: (r: Row) => r.sessions },
];

describe('ExportCsvButton', () => {
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  afterEach(() => {
    vi.restoreAllMocks();
    Object.assign(URL, { createObjectURL: original.create, revokeObjectURL: original.revoke });
  });

  it('downloads the given rows under the given name, then says how many', async () => {
    const create = vi.fn((_b: Blob) => 'blob:csv');
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const onExported = vi.fn();
    render(
      <ExportCsvButton
        filename="edufurther-sessions-2026-11-17.csv"
        columns={columns}
        rows={[
          { name: 'Ada', sessions: 3 },
          { name: 'Bola', sessions: 1 },
        ]}
        onExported={onExported}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(
      'edufurther-sessions-2026-11-17.csv',
    );
    const csv = await create.mock.calls[0]![0].text();
    expect(csv).toContain('Name,Sessions\r\nAda,3\r\nBola,1\r\n');
    expect(onExported).toHaveBeenCalledWith(2);
  });

  it('takes the page’s own words', () => {
    render(
      <ExportCsvButton label="Download my sessions" filename="x.csv" columns={columns} rows={[]} />,
    );
    expect(screen.getByRole('button', { name: 'Download my sessions' })).toBeInTheDocument();
  });
});
