import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SessionTypeQuickEdit } from './SessionTypeQuickEdit';

/** Mentor Profile.dc.html `quickOpen`: length and visibility, the "Edit {name}" modal's body. */
const meta: Meta = { title: 'Organisms/Session type quick edit' };
export default meta;
type Story = StoryObj;

// The modal body on its own, at the modal's 480px (the screen adds the ModalShell).
const inModal = (body: React.ReactNode) => <div style={{ maxWidth: 480 }}>{body}</div>;
const props = {
  initial: { durationMin: 60, visible: true },
  fullHref: '/session-types/st1/edit',
  saving: false,
  error: null,
  onSave: fn(),
  onCancel: fn(),
};

export const Default: Story = { render: () => inModal(<SessionTypeQuickEdit {...props} />) };

export const Saving: Story = {
  render: () => inModal(<SessionTypeQuickEdit {...props} saving />),
};

export const Failed: Story = {
  render: () => inModal(<SessionTypeQuickEdit {...props} error="That didn’t save. Try again." />),
};

/** An older 15-minute type keeps its length on offer. */
export const OlderLength: Story = {
  render: () =>
    inModal(<SessionTypeQuickEdit {...props} initial={{ durationMin: 15, visible: false }} />),
};
