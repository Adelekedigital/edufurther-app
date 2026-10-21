import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { CUSTOM_COPY, DAILY_COPY, MEET_COPY } from '@/lib/copy/integrations';
import { VideoProviderCard } from './VideoProviderCard';

const meta: Meta<typeof VideoProviderCard> = {
  title: 'Molecules/VideoProviderCard',
  component: VideoProviderCard,
};
export default meta;
type Story = StoryObj;

export const VideoProviderCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <VideoProviderCard
        name="story"
        value="daily"
        checked
        onChange={fn()}
        icon="video_chat"
        tone="blue"
        label={DAILY_COPY.label}
        by={DAILY_COPY.by}
        description={DAILY_COPY.desc}
        benefit={DAILY_COPY.benefit}
        recommended
      />
      <VideoProviderCard
        name="story-off"
        value="daily"
        checked={false}
        onChange={fn()}
        icon="video_chat"
        tone="blue"
        label={DAILY_COPY.label}
        by={DAILY_COPY.by}
        description={DAILY_COPY.desc}
        benefit={DAILY_COPY.benefit}
        recommended
      />
      {/* No handler: the account is on a personal link and there is no way back. */}
      <VideoProviderCard
        name="story-custom"
        value="custom"
        checked
        icon="link"
        tone="blue"
        label={CUSTOM_COPY.label}
        by="https://meet.example.com/a-very-long-personal-room-name-that-wraps"
        description={CUSTOM_COPY.note}
      />
    </div>
  ),
};

/** The compact alternative row, chosen and unchosen. */
