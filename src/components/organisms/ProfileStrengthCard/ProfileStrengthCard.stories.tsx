import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ProfileStrengthCard } from './ProfileStrengthCard';

/** Mentor Profile.dc.html `canEdit` aside: how complete the profile is, and what's next. */
const meta: Meta = { title: 'Organisms/Profile strength' };
export default meta;
type Story = StoryObj;

const side = { maxWidth: 360 };

export const TwoTips: Story = {
  render: () => (
    <div style={side}>
      <ProfileStrengthCard
        percent={78}
        tips={[
          { key: 'weekly_hours', label: 'Set your weekly hours', href: '/session-types' },
          { key: 'award', label: 'Add a scholarship or award', onSelect: fn() },
        ]}
      />
    </div>
  ),
};

export const JustStarted: Story = {
  render: () => (
    <div style={side}>
      <ProfileStrengthCard
        percent={11}
        tips={[
          { key: 'session_type', label: 'Turn on a session type', href: '/session-types' },
          { key: 'weekly_hours', label: 'Set your weekly hours', href: '/session-types' },
        ]}
      />
    </div>
  ),
};
