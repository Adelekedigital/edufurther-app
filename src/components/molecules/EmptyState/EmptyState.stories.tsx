import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = { title: 'Molecules/EmptyState', component: EmptyState };
export default meta;
type Story = StoryObj;

export const NothingMatched: Story = {
  render: () => (
    <EmptyState
      illustration="search-results"
      title="No mentors match that"
      description="Try other topics to see more mentors."
    />
  ),
};
