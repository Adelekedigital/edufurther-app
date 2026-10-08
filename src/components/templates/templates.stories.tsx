import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '@/components/atoms/Button/Button';
import { StepBars } from '@/components/atoms/StepBars/StepBars';
import { AppShell } from './AppShell/AppShell';
import { FocusPage } from './FocusPage/FocusPage';
import { ModalShell } from './ModalShell/ModalShell';

const meta: Meta = { title: 'Templates', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

const Filler = () => (
  <div style={{ height: 1200, background: 'var(--surface-subtle)', borderRadius: 10 }} />
);

const account = {
  avatar: { initial: 'E', cover: 'lilac' as const },
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
/** Bookings badge (design `badges`, grouped rail): "9+" above nine; also on the phone tab (ours). */
export const ShellMentorBadge: Story = {
  render: () => (
    <AppShell
      active="Home"
      nav="mentor"
      chrome="member"
      account={{
        ...account,
        counts: { Bookings: { count: 12, label: '12 requests awaiting your response' } },
      }}
      offline={false}
    >
      <Filler />
    </AppShell>
  ),
};
/** Mentor navigation (design AppShell role=mentor): tabs are Home, Calendar, Bookings + More. */
export const ShellMentor: Story = {
  render: () => (
    <AppShell active="Sessions" nav="mentor" chrome="member" account={account} offline={false}>
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

/** Phones: BookingModal.dc.html `mobileView=sheet` chrome around a content slot. */
export const ModalSheet: Story = {
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  render: function Render() {
    const [open, setOpen] = useState(true);
    return open ? (
      <ModalShell
        title="Book General mentorship"
        onClose={() => setOpen(false)}
        sheet={{
          caption: 'Step 2 of 3',
          heading: 'Create your free account',
          leading: { icon: 'arrow_back', label: 'Back', onClick: fn() },
          showClose: true,
          progress: <StepBars total={3} current={1} label="Step 2 of 3" thin />,
        }}
        footer={<Button fullWidth>Continue with email</Button>}
      >
        <p>Content slot. It scrolls; the header, bars and footer do not.</p>
        <Filler />
      </ModalShell>
    ) : (
      <button onClick={() => setOpen(true)}>Open</button>
    );
  },
};

/** Modal.dc.html `tone="success"` (Session Types "Session type published"). */
export const ModalSuccess: Story = {
  render: () => (
    <ModalShell
      title="Session type published"
      subtitle="“SOP draft review” is live on your profile. Mentees can book it in your open hours."
      icon="check_circle"
      tone="success"
      size="sm"
      onClose={fn()}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Button size="large" variant="secondary-outlined" fullWidth>
          View on profile
        </Button>
        <Button size="large" fullWidth>
          Done
        </Button>
      </div>
    </ModalShell>
  ),
};

/** Modal.dc.html `tone="danger"`: every destructive action confirms here. */
export const ModalDanger: Story = {
  render: () => (
    <ModalShell
      title="Delete this session type?"
      subtitle="“SOP draft review” will be removed from your profile."
      icon="delete"
      tone="danger"
      size="sm"
      onClose={fn()}
    >
      <p>Buttons come with the confirm organism (PR 2).</p>
    </ModalShell>
  ),
};

/** Session Join.dc.html frame: slim header, one way back, no nav rail. */
export const FocusPageFrame: Story = {
  render: () => (
    <FocusPage back={{ href: '/bookings', label: 'Go to Bookings' }}>
      <p>The session card goes here.</p>
    </FocusPage>
  ),
};

export const FocusPageOffline: Story = {
  render: () => (
    <FocusPage back={{ href: '/bookings', label: 'Go to Bookings' }} offline>
      <p>The session card goes here.</p>
    </FocusPage>
  ),
};
