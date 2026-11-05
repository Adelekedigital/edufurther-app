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

/** `fullWidthActions`: a card's one action fills it (the invite's existing-account card). */
export const FullWidthAction: Story = {
  render: () => (
    <div
      style={{
        maxWidth: 440,
        padding: '32px 24px',
        border: '1px solid var(--ink-200)',
        borderRadius: 12,
      }}
    >
      <EmptyState
        illustration="team"
        size={96}
        headingLevel={1}
        title="You already have an EduFurther account"
        description="Invites are for new members, so this one doesn’t add a credit."
        fullWidthActions
        actions={
          <button type="button" style={{ height: 48 }}>
            Go to Home
          </button>
        }
      />
    </div>
  ),
};

/** `variant="card"`: a drawn notice card's type (H5, 14px ink-700). */
export const CardVariant: Story = {
  render: () => (
    <div
      style={{
        maxWidth: 440,
        padding: '32px 24px',
        border: '1px solid var(--ink-200)',
        borderRadius: 12,
      }}
    >
      <EmptyState
        illustration="team"
        size={96}
        headingLevel={1}
        variant="card"
        title="You already have an EduFurther account"
        description="Invites are for new members, so this one doesn’t add a credit."
        fullWidthActions
        actions={
          <button type="button" style={{ height: 48 }}>
            Go to Home
          </button>
        }
      />
    </div>
  ),
};
