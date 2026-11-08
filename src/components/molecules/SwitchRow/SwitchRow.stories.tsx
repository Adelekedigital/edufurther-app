import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SwitchRow } from './SwitchRow';

const meta: Meta<typeof SwitchRow> = {
  title: 'Molecules/SwitchRow',
  component: SwitchRow,
  args: {
    label: 'Notifications on this device',
    hint: 'New messages, booking requests and replies, and a reminder before each session.',
    checked: false,
    onChange: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof SwitchRow>;

export const Off: Story = {};
export const On: Story = { args: { checked: true } };
export const Loading: Story = { args: { loading: true } };
export const Busy: Story = { args: { busy: true, checked: true } };
export const NoSwitch: Story = { args: { noSwitch: true, hint: 'Blocked in this browser.' } };
