import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GoalSummaryCard } from './GoalSummaryCard';

const meta: Meta = { title: 'Molecules/GoalSummaryCard' };
export default meta;
type Story = StoryObj;

const card = (title: string, meta: string) => (
  <div style={{ maxWidth: 760 }}>
    <GoalSummaryCard title={title} meta={meta} editLabel="Edit goals" onEdit={() => {}} />
  </div>
);

export const Default: Story = {
  render: () =>
    card('Master’s in Public health', 'United Kingdom, Canada · 2 schools · 3 help topics'),
};
/** Empty parts left out of the meta line. */
export const Sparse: Story = { render: () => card('MBA', 'United States · 1 help topic') };
export const LongContent: Story = {
  render: () =>
    card(
      'Master’s in Environmental and Natural Resource Economics and Policy',
      'United Kingdom, Netherlands, Germany · 10 schools · 6 help topics',
    ),
};
/** 390px: the button wraps under the text. */
export const Narrow: Story = {
  render: () => (
    <div style={{ maxWidth: 358 }}>
      <GoalSummaryCard
        title="Master’s in Public health"
        meta="United Kingdom, Canada · 2 schools · 3 help topics"
        editLabel="Edit goals"
        onEdit={() => {}}
      />
    </div>
  ),
};
