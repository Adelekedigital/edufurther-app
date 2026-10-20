import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from '../Input/Input';
import { FrozenGroup } from './FrozenGroup';

/** Controls that hold still during a review: dimmed, disabled, out of the tab order. */
const meta: Meta<typeof FrozenGroup> = {
  title: 'Atoms/FrozenGroup',
  component: FrozenGroup,
  args: {
    children: <Input aria-label="Headline" defaultValue="PhD Sociology · Mississippi State" />,
  },
};
export default meta;
type Story = StoryObj<typeof FrozenGroup>;

export const Frozen: Story = { args: { frozen: true } };
export const Live: Story = { args: { frozen: false } };
