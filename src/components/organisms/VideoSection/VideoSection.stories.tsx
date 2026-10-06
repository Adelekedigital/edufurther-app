import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { VideoSection } from './VideoSection';

/** Integrations "Video for sessions", at the design's saved defaults. */
const meta: Meta = { title: 'Integrations/Video section', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const base = {
  onPick: fn(),
  saving: false,
  error: null,
  link: '',
  savedLink: '',
  onLinkChange: fn(),
  savingLink: false,
  linkError: null,
  onUseLink: fn(),
  onKeepAutomatic: fn(),
};

export const EduFurtherVideo: Story = {
  render: () => (
    <div style={{ maxWidth: 880 }}>
      <VideoSection {...base} provider="daily" />
    </div>
  ),
};

export const GoogleMeetChosen: Story = {
  render: () => (
    <div style={{ maxWidth: 880 }}>
      <VideoSection {...base} provider="google_meet" />
    </div>
  ),
};

/** The panel opens by itself when a personal link is already the choice. */
export const PersonalLinkInUse: Story = {
  render: () => (
    <div style={{ maxWidth: 880 }}>
      <VideoSection
        {...base}
        provider="custom"
        link="https://meet.example.com/a-very-long-personal-room-name-that-wraps-on-a-phone"
        savedLink="https://meet.example.com/a-very-long-personal-room-name-that-wraps-on-a-phone"
      />
    </div>
  ),
};

/** A link that is not https: the button stays off and says why (ours, not drawn). */
export const PersonalLinkInvalid: Story = {
  render: () => (
    <div style={{ maxWidth: 880 }}>
      <VideoSection {...base} provider="daily" link="http://meet.example.com/room" />
    </div>
  ),
};

/** A failed save puts the card back and says so, rather than rolling back silently. */
export const SaveFailed: Story = {
  render: () => (
    <div style={{ maxWidth: 880 }}>
      <VideoSection
        {...base}
        provider="daily"
        error="We couldn’t save your video setting. Try again."
      />
    </div>
  ),
};

export const Saving: Story = {
  render: () => (
    <div style={{ maxWidth: 880 }}>
      <VideoSection {...base} provider="google_meet" saving />
    </div>
  ),
};
