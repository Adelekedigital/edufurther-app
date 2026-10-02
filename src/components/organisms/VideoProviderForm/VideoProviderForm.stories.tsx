import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { VideoProviderForm } from './VideoProviderForm';

/** Calendar v2 "Video for sessions" body. */
const meta: Meta = { title: 'Calendar/Video provider', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

export const VideoProvider: Story = {
  render: () => (
    <div style={{ maxWidth: 512 }}>
      <VideoProviderForm
        initial="daily"
        customUrl={null}
        saving={false}
        error={null}
        onCancel={fn()}
        onSave={fn()}
      />
    </div>
  ),
};

export const VideoProviderPersonalLinkAndFailed: Story = {
  render: () => (
    <div style={{ maxWidth: 512 }}>
      <VideoProviderForm
        initial="custom"
        customUrl="https://meet.example.com/a-very-long-personal-room-name-that-wraps"
        saving={false}
        error="We couldn’t save your video setting. Try again."
        onCancel={fn()}
        onSave={fn()}
      />
    </div>
  ),
};
