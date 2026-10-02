import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ReturnDateForm } from './ReturnDateForm';

/** Calendar v2 "When will you be back?" body. */
const meta: Meta = { title: 'Calendar/Return date', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

export const ReturnDate: Story = {
  render: () => (
    <div style={{ maxWidth: 432 }}>
      <ReturnDateForm
        today="2026-09-26"
        booked={[{ day: '2026-10-04', mentee: 'Taofeeq' }]}
        saving={false}
        error={null}
        onCancel={fn()}
        onSave={fn()}
      />
    </div>
  ),
};

export const ReturnDateFailed: Story = {
  render: () => (
    <div style={{ maxWidth: 432 }}>
      <ReturnDateForm
        today="2026-09-26"
        booked={[]}
        saving={false}
        error="We couldn’t set you as busy. Try again."
        onCancel={fn()}
        onSave={fn()}
      />
    </div>
  ),
};
