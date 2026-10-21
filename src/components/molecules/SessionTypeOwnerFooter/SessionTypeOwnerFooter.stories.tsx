import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SessionTypeOwnerFooter } from './SessionTypeOwnerFooter';

const meta: Meta<typeof SessionTypeOwnerFooter> = {
  title: 'Molecules/SessionTypeOwnerFooter',
  component: SessionTypeOwnerFooter,
};
export default meta;
type Story = StoryObj;

export const SessionOwnerFooter: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <SessionTypeOwnerFooter name="SOP draft review" onHide={fn()} onEdit={fn()} onDelete={fn()} />
    </div>
  ),
};

/** Bookings.dc.html: how a past session ended. Six outcomes, three tones. */
