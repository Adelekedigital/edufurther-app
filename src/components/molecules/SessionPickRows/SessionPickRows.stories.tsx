import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { SessionPickRows, type PickRow } from './SessionPickRows';

/** ReviewModal.dc.html `hasRows` (design reply #54). */
const meta: Meta = { title: 'Molecules/Session pick rows' };
export default meta;
type Story = StoryObj;

const all: PickRow[] = [
  { id: 'a', type: 'SOP review', date: 'Sep 19' },
  { id: 'b', type: 'Scholarship strategy', date: 'Sep 12' },
  { id: 'c', type: 'SOP review', date: 'Sep 5' },
  { id: 'd', type: 'Program shortlist', date: 'Aug 29' },
  { id: 'e', type: 'Visa interview prep', date: 'Aug 22' },
];

function Pick({ rows }: { rows: PickRow[] }) {
  const [v, setV] = useState<string | null>(rows[0]!.id);
  return (
    <div style={{ maxWidth: 432 }}>
      <SessionPickRows label="Which session is this about?" rows={rows} value={v} onChange={setV} />
    </div>
  );
}

export const TwoSessions: Story = { render: () => <Pick rows={all.slice(0, 2)} /> };
export const ThreeSessions: Story = { render: () => <Pick rows={all.slice(0, 3)} /> };
export const FiveSessions: Story = { render: () => <Pick rows={all} /> };
export const LongTypeName: Story = {
  render: () => (
    <Pick
      rows={[
        { id: 'x', type: 'Statement of purpose and personal history essay review', date: 'Sep 19' },
        ...all.slice(1, 3),
      ]}
    />
  ),
};
export const Phone: Story = {
  render: () => <Pick rows={all} />,
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};
