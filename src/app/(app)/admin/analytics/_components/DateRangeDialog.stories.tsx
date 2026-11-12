import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { DateRangeDialog } from './DateRangeDialog';

const meta: Meta<typeof DateRangeDialog> = {
  title: 'Admin/Analytics/DateRangeDialog',
  component: DateRangeDialog,
  args: { today: '2026-11-12', onApply: fn(), onClose: fn() },
};
export default meta;
type Story = StoryObj<typeof DateRangeDialog>;

/** Nothing picked yet: type a start and end, or pick on the calendar. */
export const Empty: Story = { args: { initial: null } };

/** A year's range already applied: the calendar opens on its first month. */
export const YearRange: Story = { args: { initial: { from: '2026-01-01', to: '2026-11-12' } } };
