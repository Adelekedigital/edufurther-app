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

/** Invite Landing.dc.html benefits: `variant="feature"` as list items. */
export const Features: Story = {
  render: () => (
    <ul
      aria-label="Why EduFurther"
      style={{ maxWidth: 480, listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 16 }}
    >
      <IconListItem
        as="li"
        variant="feature"
        icon="school"
        tone="blue"
        title="Mentors who’ve been through it"
        meta="Every mentor got into grad school and knows the applications you’re facing now."
      />
      <IconListItem
        as="li"
        variant="feature"
        icon="redeem"
        tone="blue"
        title="Your first session is free"
        meta="Pick a mentor and a time that suits you."
      />
    </ul>
  ),
};
