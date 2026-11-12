import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { toOverview } from '@/lib/api/data/adminAnalytics';
import { mockSection, mockWindow } from '@/lib/api/mock/adminAnalytics';
import { OverviewTab } from './OverviewTab';

const data = (compare: boolean) =>
  toOverview(mockSection('overview', mockWindow({ compare: String(compare) })!, false));

const meta: Meta<typeof OverviewTab> = {
  title: 'Admin/Analytics/OverviewTab',
  component: OverviewTab,
  args: { windowLabel: 'Last 30 days', onOpen: fn(), onShow: fn(), onRole: fn() },
};
export default meta;
type Story = StoryObj<typeof OverviewTab>;

/** Compare on: every sub-track, active members included, with its change. */
export const Compare: Story = { args: { data: data(true), compare: true } };

/** Show: Active members (owner pick B): weekly active as the headline, the trend, the split by role. */
export const ActiveMembers: Story = { args: { data: data(true), compare: true, show: 'active' } };

/** Active members filtered to mentors: every figure, the words and the trend follow; no split line. */
export const ActiveMentors: Story = {
  args: { data: data(true), compare: true, show: 'active', role: 'mentor' },
};

/** The first week (every trend point a gap): the empty pattern says when the trend starts. */
export const ActiveFirstWeek: Story = {
  args: {
    compare: false,
    show: 'active',
    data: (() => {
      const d = data(false);
      return {
        ...d,
        to: '2026-11-12',
        activeMembers: {
          ...d.activeMembers,
          historyFrom: '2026-11-13',
          series: d.activeMembers.series!.map((p) => ({
            ...p,
            value: null,
            previous: null,
            byRole: null,
          })),
        },
      };
    })(),
  },
};

/** Compare off: values only. */
export const NoCompare: Story = { args: { data: data(false), compare: false } };
