import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TokenField, type TokenValue } from './TokenField';

const meta: Meta<typeof TokenField> = { title: 'Molecules/TokenField', component: TokenField };
export default meta;
type Story = StoryObj;

// TokenField.dc.html's sample values.
const VALUES: TokenValue[] = [
  {
    name: 'recipientName',
    meaning: 'First name of the person getting the email',
    example: 'Amara',
  },
  { name: 'mentorName', meaning: 'Mentor’s full name', example: 'Tunde Bakare' },
  { name: 'sessionDate', meaning: 'Session date', example: 'Tue, Nov 18' },
  { name: 'sessionTime', meaning: 'Start time', example: '3:00 pm' },
];

function Field({
  initial,
  label = 'Subject',
  ...rest
}: { initial: string; label?: string } & Partial<React.ComponentProps<typeof TokenField>>) {
  const [v, setV] = useState(initial);
  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label htmlFor="tf" style={{ fontWeight: 600, fontSize: 14 }}>
        {label}
      </label>
      <TokenField id="tf" value={v} onChange={setV} values={VALUES} {...rest} />
    </div>
  );
}

/** The design's saved default: one known value. Type / or press { } to add one. */
export const Default: Story = {
  render: () => <Field initial="Your session with {mentorName} is booked" />,
};

/** An unknown value draws red; the parent shows the message beside the red ring. */
export const Invalid: Story = {
  render: () => <Field initial="Your session with {mentorname} is booked" invalid />,
};

export const ReadOnly: Story = {
  render: () => <Field initial="Your session with {mentorName} is booked" readOnly />,
};

/** 16px text so phones don't zoom into the field. */
export const Mobile: Story = {
  render: () => <Field initial="Your session with {mentorName} is booked" mobile />,
};

/** Long copy wraps; the caret must stay on the text across lines and around chips. */
export const Wrapping: Story = {
  render: () => (
    <Field
      label="Heading"
      initial="{recipientName}, your session with {mentorName} on {sessionDate} at {sessionTime} is booked and ready"
      maxLength={200}
    />
  ),
};

/** Empty: the placeholder shows. */
export const Empty: Story = {
  render: () => <Field initial="" />,
};
