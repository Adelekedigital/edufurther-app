import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { MISSED_REASON_COPY as C } from '@/lib/copy/session';
import { MissedReasonForm } from './MissedReasonForm';

const meta: Meta<typeof MissedReasonForm> = {
  title: 'Molecules/MissedReasonForm',
  component: MissedReasonForm,
  args: {
    question: C.question,
    options: [...C.options],
    placeholder: C.placeholder,
    sendLabel: C.send,
    thanks: C.thanks,
    noteMax: C.noteMax,
    onSend: fn(),
    sent: false,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof MissedReasonForm>;

/** Send stays off until a chip is picked. */
export const Asking: Story = {};
export const Sending: Story = { args: { pending: true } };
export const Failed: Story = { args: { error: C.failed } };
export const Sent: Story = { args: { sent: true } };
