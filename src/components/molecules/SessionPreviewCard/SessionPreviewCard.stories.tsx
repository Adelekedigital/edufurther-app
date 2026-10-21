import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SessionPreviewCard } from './SessionPreviewCard';

const meta: Meta<typeof SessionPreviewCard> = {
  title: 'Molecules/SessionPreviewCard',
  component: SessionPreviewCard,
};
export default meta;
type Story = StoryObj;

/** What a mentee sees before booking. */
export const Preview: Story = {
  render: () => (
    <SessionPreviewCard
      name="SOP draft review"
      description="We’ll work through your statement of purpose together. You’ll leave with a prioritized revision list."
      facts={['60 min', 'Document preparation', 'School selection']}
    />
  ),
};
