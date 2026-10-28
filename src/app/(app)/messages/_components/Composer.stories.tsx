import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Composer } from './Composer';

/** The chat's composer (Messages.dc.html footer): empty, typed, contact details, offline. */
const meta: Meta<typeof Composer> = {
  title: 'Screens/Messages composer',
  component: Composer,
  args: { first: 'Ujunwa', onSend: fn(), phone: false, offline: false, value: '', onChange: fn() },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return (
      <div style={{ maxWidth: 640 }}>
        <Composer {...args} value={value} onChange={setValue} />
      </div>
    );
  },
};
export default meta;
type Story = StoryObj<typeof Composer>;

export const Empty: Story = {};
export const Typed: Story = { args: { value: 'See you on Tuesday!' } };
export const ContactDetails: Story = { args: { value: 'Email me at amara@example.com' } };
export const Offline: Story = { args: { offline: true } };
