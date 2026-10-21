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
      <Notice tone="subtle" icon="lock" title="We’re reviewing your application.">
        You can edit these once it’s reviewed. Spotted a mistake? <a href="#contact">Contact us</a>
      </Notice>
      <Notice tone="info" icon="refresh" title="The list was updated." onDismiss={fn()}>
        We’ve started you back at the top.
      </Notice>
    </div>
  ),
};
