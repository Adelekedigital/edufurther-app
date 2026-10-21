import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { CUSTOM_COPY, DAILY_COPY, MEET_COPY } from '@/lib/copy/integrations';
import { VideoProviderRow } from './VideoProviderRow';

const meta: Meta<typeof VideoProviderRow> = {
  title: 'Molecules/VideoProviderRow',
  component: VideoProviderRow,
};
export default meta;
type Story = StoryObj;

export const VideoProviderRows: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <VideoProviderRow
        name="rows"
        value="google_meet"
        checked
        onChange={fn()}
        icon="videocam"
        tone="green"
        label={MEET_COPY.label}
        note={MEET_COPY.note}
      />
      <VideoProviderRow
        name="rows-off"
        value="google_meet"
        checked={false}
        onChange={fn()}
        icon="videocam"
        tone="green"
        label={MEET_COPY.label}
        note={MEET_COPY.note}
      />
    </div>
  ),
};
