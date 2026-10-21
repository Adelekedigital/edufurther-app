import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { VideoSection } from './VideoSection';

/** Integrations "Video for sessions", at the design's saved defaults. */
const meta: Meta = { title: 'Integrations/Video section', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const base = { onPick: fn(), customUrl: null };

export const EduFurtherVideo: Story = {
  render: () => (
    <div style={{ maxWidth: 880 }}>
      <VideoSection {...base} provider="daily" />
    </div>
  ),
};

/** The recommended card keeps its size when it is not the choice. */
export const GoogleMeetChosen: Story = {
  render: () => (
    <div style={{ maxWidth: 880 }}>
      <VideoSection {...base} provider="google_meet" />
    </div>
  ),
};

/**
 * Support can still put an account on a personal link. It shows read-only, the
 * label above the alternatives turns plural, and switching away is one-way.
 */
export const PersonalLinkInUse: Story = {
  render: () => (
    <div style={{ maxWidth: 880 }}>
      <VideoSection
        {...base}
        provider="custom"
        customUrl="https://meet.example.com/a-very-long-personal-room-name-that-wraps-on-a-phone"
      />
    </div>
  ),
};
