import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StepChecklist } from './StepChecklist';

const meta: Meta<typeof StepChecklist> = {
  title: 'Molecules/StepChecklist',
  component: StepChecklist,
  decorators: [(S) => <div style={{ maxWidth: 360 }}>{<S />}</div>],
};
export default meta;
type Story = StoryObj<typeof StepChecklist>;

/** The credits card (decision 370): each step +1, ticked on its own. */
export const CreditLevels: Story = {
  args: {
    label: 'Earn up to 3 credits a month',
    doneLabel: 'done',
    size: 'sm',
    steps: [
      { key: 'profile', label: 'Finish your profile', value: '+1', done: true },
      { key: 'session', label: 'Attend a session', value: '+1', done: true },
      {
        key: 'friend',
        label: 'A friend joins',
        value: '+1',
        done: false,
        sub: 'Invite a friend. It counts once they finish their profile.',
      },
    ],
  },
};

/** InviteModal: the tense says done, so no extra label. */
export const InviteSteps: Story = {
  args: {
    label: 'How to get 3 free sessions every month',
    steps: [
      { key: 'friend', label: 'A friend joined and set up their profile', done: true },
      { key: 'attend', label: 'You attend your first session', done: false },
    ],
  },
};
