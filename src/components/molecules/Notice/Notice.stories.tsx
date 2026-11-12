import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Notice } from './Notice';

const meta: Meta<typeof Notice> = { title: 'Molecules/Notice', component: Notice };
export default meta;
type Story = StoryObj;

/** The tones, including the dismissible one. */
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
      <Notice tone="neutral" icon="cloud_off" title="You’re offline.">
        These are mentors from your last visit.
      </Notice>
      <Notice tone="info" icon="refresh" title="The list was updated." onDismiss={fn()}>
        We’ve started you back at the top.
      </Notice>
      {/* The DS Notice `info` tone, which replaced the retired amber `warning` (2026-11-12). */}
      <Notice tone="brand">
        Funnels come from PostHog, which isn’t answering right now. Database numbers on this page
        are up to date. Try again in a few minutes.
      </Notice>
      <Notice tone="danger">We couldn’t submit your application. Try again.</Notice>
    </div>
  ),
};
