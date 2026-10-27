import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { toAdminMentorRow, toAdminMentorDetail } from '@/lib/api/data/adminMentors';
import { mockMentorDetail, mockMentorRows } from '@/lib/api/mock/adminMentors';
import { MENTOR_TABLE } from '@/lib/copy/adminMentors';
import { MentorBulkBar } from './MentorBulkBar';
import { MentorDialogs } from './MentorDialogs';
import { MentorDrawer } from './MentorDrawer';
import { MentorTable, MentorTableSkeleton } from './MentorTable';

const rows = (tab: Parameters<typeof mockMentorRows>[0]) =>
  mockMentorRows(tab, '').map(toAdminMentorRow);
const apps = rows('applications');

/**
 * The admin Mentors table, by tab (Admin.dc.html mentorLayout=drawer). The
 * screen owns the error and empty cards; the table draws content and loading.
 */
const meta: Meta<typeof MentorTable> = {
  title: 'Screens/Admin mentors',
  component: MentorTable,
  args: {
    tab: 'applications',
    rows: apps,
    zone: 'Africa/Lagos',
    openId: null,
    onOpen: fn(),
    selectable: true,
    checked: [],
    onToggle: fn(),
    onToggleAll: fn(),
    rowRef: () => () => {},
  },
};
export default meta;
type Story = StoryObj<typeof MentorTable>;

export const Applications: Story = {};
export const CheckedAndOpen: Story = {
  args: { checked: [apps[1]!.id], openId: apps[0]!.id },
  render: (a) => (
    <div style={{ display: 'grid', gap: 20 }}>
      <MentorBulkBar count={1} onClear={fn()} onApprove={fn()} />
      <MentorTable {...a} />
    </div>
  ),
};
export const Approved: Story = {
  args: { tab: 'approved', rows: rows('approved'), selectable: false },
};
export const Paused: Story = { args: { tab: 'paused', rows: rows('paused'), selectable: false } };
export const NotApproved: Story = {
  args: { tab: 'notApproved', rows: rows('not_approved'), selectable: false },
};
export const LongNames: Story = {
  args: {
    rows: apps.map((r) => ({
      ...r,
      name: `${r.name} Oluwaseun Adebayo-Williamson`,
      email: `a.very.long.address.${r.email}`,
    })),
  },
};
export const Limited: Story = { args: { selectable: false } };
export const Loading: Story = {
  render: () => <MentorTableSkeleton label={MENTOR_TABLE.loading} />,
};

const detail = (id: string) => toAdminMentorDetail(mockMentorDetail(id)!);
const drawer = (id: string, tab: Parameters<typeof MentorDrawer>[0]['tab']) => (
  <MentorDrawer
    row={[...apps, ...rows('approved'), ...rows('paused')].find((r) => r.id === id)!}
    tab={tab}
    detail={detail(id)}
    detailStatus="ready"
    onRetry={fn()}
    notes={[]}
    notesStatus="ready"
    onRetryNotes={fn()}
    onAddNote={async () => {}}
    canDecide
    onAction={fn()}
    onClose={fn()}
    zone="Africa/Lagos"
  />
);
export const DrawerApplication: Story = { render: () => drawer('m-jm', 'applications') };
export const DrawerApproved: Story = { render: () => drawer('m-jl', 'approved') };
export const DrawerPaused: Story = { render: () => drawer('m-fa', 'paused') };
export const DrawerSelfPaused: Story = { render: () => drawer('m-co', 'paused') };
export const ConfirmDecline: Story = {
  render: () => (
    <MentorDialogs
      dialog={{ kind: 'decline', mentor: apps[0]! }}
      pending={false}
      onCancel={fn()}
      onConfirm={fn()}
    />
  ),
};
export const ConfirmBulk: Story = {
  render: () => (
    <MentorDialogs
      dialog={{ kind: 'bulk', mentors: apps.slice(0, 3) }}
      pending={false}
      onCancel={fn()}
      onConfirm={fn()}
    />
  ),
};
