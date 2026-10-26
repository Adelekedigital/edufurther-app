import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DateChip } from './DateChip';

const meta: Meta<typeof DateChip> = {
  title: 'Molecules/DateChip',
  component: DateChip,
  args: { iso: '2026-10-04T12:00:00Z', timeZone: 'Africa/Lagos' },
};
export default meta;
type Story = StoryObj<typeof DateChip>;

export const Default: Story = {};

/** A two-digit day keeps the 56px width. */
export const TwoDigitDay: Story = { args: { iso: '2026-09-28T12:00:00Z' } };
