import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card } from './Card';

/** The drawn card surface; the caller lays out what's inside. */
const meta: Meta<typeof Card> = {
  title: 'Atoms/Card',
  component: Card,
  args: { children: 'Your weekly hours', style: { maxWidth: 360 } },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {};
export const Compact: Story = { args: { padding: 'md' } };
export const Info: Story = { args: { tone: 'info', children: 'Your next session' } };
export const Success: Story = { args: { tone: 'success', children: 'Your first mentees' } };
