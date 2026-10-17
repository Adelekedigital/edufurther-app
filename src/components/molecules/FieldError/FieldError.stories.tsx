import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FieldError } from './FieldError';

// role="alert": a screen reader says the words as soon as the line appears.
const meta: Meta<typeof FieldError> = {
  title: 'Molecules/FieldError',
  component: FieldError,
  args: { children: 'Enter a valid email address.' },
};
export default meta;
type Story = StoryObj<typeof FieldError>;

export const Default: Story = {};

/** Tied to its field: the input's aria-describedby points at this id. */
export const DescribingAField: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
      <label htmlFor="story-email">Email</label>
      <input id="story-email" aria-invalid aria-describedby="story-email-error" />
      <FieldError {...args} id="story-email-error" />
    </div>
  ),
};

export const OtherIcon: Story = {
  args: { icon: 'info', children: 'That code has expired. We sent a new one.' },
};
