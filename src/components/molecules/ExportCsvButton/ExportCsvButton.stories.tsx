import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ExportCsvButton } from './ExportCsvButton';

const meta: Meta<typeof ExportCsvButton> = {
  title: 'Molecules/ExportCsvButton',
  component: ExportCsvButton,
};
export default meta;
type Story = StoryObj;

type Row = { name: string; sessions: number };

/** Exports the rows it is given: here two mentors and their sessions. */
export const Default: Story = {
  render: () => (
    <ExportCsvButton<Row>
      filename="edufurther-mentors-approved-2026-11-17.csv"
      columns={[
        { header: 'Name', value: (r) => r.name },
        { header: 'Sessions', value: (r) => r.sessions },
      ]}
      rows={[
        { name: 'Ada Okafor', sessions: 12 },
        { name: 'Bola Ade', sessions: 4 },
      ]}
    />
  ),
};
