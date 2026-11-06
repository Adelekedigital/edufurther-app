import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StepChecklist } from './StepChecklist';

const meta: Meta<typeof StepChecklist> = {
  title: 'Molecules/StepChecklist',
  component: StepChecklist,
  decorators: [(S) => <div style={{ maxWidth: 360 }}>{<S />}</div>],
};
export default meta;
type Story = StoryObj<typeof StepChecklist>;

/** The credits card: what each step pays, ticked by level. */
export const CreditLevels: Story = {
  args: {
    label: 'Your monthly credits',
    doneLabel: 'done',
    steps: [
      { key: '1', label: 'Finish your profile', value: '1 a month', done: true },
      {
        key: '2',
        label: 'A friend you invited finishes their profile',
        value: '2 a month',
        done: true,
      },
      { key: '3', label: 'Attend a session too', value: '3 a month', done: false },
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
