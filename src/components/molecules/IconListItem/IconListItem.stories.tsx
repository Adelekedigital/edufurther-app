import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { IconListItem } from './IconListItem';

const meta: Meta<typeof IconListItem> = {
  title: 'Molecules/IconListItem',
  component: IconListItem,
};
export default meta;
type Story = StoryObj;

export const ProfileListRows: Story = {
  render: () => (
    <div style={{ maxWidth: 560, border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
      <IconListItem
        icon="school"
        tone="blue"
        title="PhD, Sociology"
        meta="Mississippi State University · 2023 – 2027"
      />
      <IconListItem
        icon="workspace_premium"
        tone="gold"
        title="Graduate Teaching Assistantship with a very long title that has to wrap onto a second line"
        meta="Mississippi State University · 2021"
      />
      <IconListItem icon="school" tone="blue" title="MSc" />
    </div>
  ),
};
