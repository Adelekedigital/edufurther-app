import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { AppShell } from './AppShell/AppShell';
import { ModalShell } from './ModalShell/ModalShell';

const meta: Meta = { title: 'Templates', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

const Filler = () => (
  <div style={{ height: 1200, background: 'var(--surface-subtle)', borderRadius: 10 }} />
);

const account = {
  initial: 'E',
  items: [
    {
      key: 'matches',
      label: 'Find my mentor matches',
      icon: 'route' as const,
      href: '#',
      external: true,
    },
    { key: 'logout', label: 'Logout', icon: 'logout' as const, danger: true, onSelect: fn() },
  ],
};

export const ShellMentee: Story = {
  render: () => (
    <AppShell active="Explore" chrome="member" account={account} offline={false}>
      <Filler />
    </AppShell>
  ),
};
/** Session not known yet: no guest buttons, no navigation. */
export const ShellPending: Story = {
  render: () => (
    <AppShell active="Explore" chrome="pending" offline={false}>
      <Filler />
    </AppShell>
  ),
};
export const ShellGuest: Story = {
  render: () => (
    <AppShell active="Explore" chrome="guest" offline={false}>
      <Filler />
    </AppShell>
  ),
};
export const ShellOffline: Story = {
  render: () => (
    <AppShell active="Explore" chrome="member" account={account} offline>
      <Filler />
    </AppShell>
  ),
};
export const Modal: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true);
    return open ? (
      <ModalShell
        title="Book General mentorship"
        subtitle="Step 1 of 2 · Pick a date and time"
        size="xl"
        onClose={() => setOpen(false)}
      >
        <p>Content slot.</p>
      </ModalShell>
    ) : (
      <button onClick={() => setOpen(true)}>Open</button>
    );
  },
};
