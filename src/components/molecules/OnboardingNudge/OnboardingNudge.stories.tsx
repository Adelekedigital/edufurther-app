import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { OnboardingNudge } from './OnboardingNudge';

const meta: Meta<typeof OnboardingNudge> = {
  title: 'Molecules/OnboardingNudge',
  component: OnboardingNudge,
  args: { href: '/onboarding', onDismiss: fn(), missing: ['plans'] },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof OnboardingNudge>;

export const StudyPlans: Story = {};
export const HelpAreas: Story = { args: { missing: ['help'] } };
export const Both: Story = { args: { missing: ['help', 'plans'] } };
