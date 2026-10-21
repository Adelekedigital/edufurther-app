import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SummarySection } from './SummarySection';

const meta: Meta<typeof SummarySection> = {
  title: 'Molecules/SummarySection',
  component: SummarySection,
};
export default meta;
type Story = StoryObj;

export const CoreDetails: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <SummarySection
        title="Core details"
        onEdit={fn()}
        rows={[
          { k: 'Name', v: 'SOP draft review' },
          { k: 'Topics', v: 'Document preparation, School selection' },
          { k: 'Best for', v: 'Drafting' },
        ]}
      />
    </div>
  ),
};
