import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { fn } from 'storybook/test';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { OwnSessionType } from '@/types/sessionType';
import {
  DeleteConfirm,
  FeatureConfirm,
  VisibilityConfirm,
  type ConfirmShell,
} from './SessionTypeConfirms';

/** The confirms a session type's actions open (Session Types.dc.html). */
const meta: Meta = { title: 'Organisms/Session type confirms' };
export default meta;
type Story = StoryObj;

const T = (over: Partial<OwnSessionType> = {}): OwnSessionType => ({
  id: 'a',
  name: 'SOP draft review',
  description: '',
  durationMin: 60,
  noticeMin: 1440,
  isLive: true,
  stages: [],
  customStage: null,
  topics: [],
  icon: 'edit_document',
  iconChoice: null,
  questionCount: 0,
  isFeatured: false,
  pendingDeletion: null,
  booked: { count: 0, lastEndsAt: null },
  ...over,
});
// Organism stories can't import ModalShell (a template), so this stand-in
// frame is 400px like the modal's sm size, with its icon and tone; the page
// renders it in ModalShell.
const renderShell = (s: ConfirmShell, body: ReactNode) => (
  <div
    role="dialog"
    aria-label={s.title}
    style={{
      maxWidth: 400,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      border: '1px solid var(--border-subtle)',
      borderRadius: 16,
    }}
  >
    <span
      style={{
        display: 'grid',
        placeItems: 'center',
        width: 'var(--space-12)',
        height: 'var(--space-12)',
        borderRadius: 'var(--radius-full)',
        background: `var(--modal-icon${s.tone ? '-danger' : ''}-bg)`,
        boxShadow: `0 0 0 6px var(--modal-icon${s.tone ? '-danger' : ''}-ring)`,
        color: `var(--modal-icon${s.tone ? '-danger' : ''}-ink)`,
      }}
    >
      <Icon name={s.icon} size={24} />
    </span>
    <div>
      <h2 style={{ margin: 0, fontSize: 18 }}>{s.title}</h2>
      <p style={{ margin: '4px 0 0', color: 'var(--text-tertiary)' }}>{s.subtitle}</p>
    </div>
    {body}
  </div>
);

const del = { renderShell, busy: false, error: null, onKeep: fn(), onDelete: fn() };

export const Delete: Story = { render: () => <DeleteConfirm {...del} type={T()} /> };
export const ScheduleDeletion: Story = {
  render: () => (
    <DeleteConfirm
      {...del}
      type={T({ isFeatured: true, booked: { count: 2, lastEndsAt: '2026-10-14T12:00:00Z' } })}
    />
  ),
};
export const DeleteRefused: Story = {
  render: () => (
    <DeleteConfirm
      {...del}
      type={T()}
      error={{
        kind: 'offline',
        message: 'We couldn’t delete it. You’re offline. Try again.',
      }}
    />
  ),
};
export const DeleteBusy: Story = { render: () => <DeleteConfirm {...del} busy type={T()} /> };
export const Feature: Story = {
  render: () => (
    <FeatureConfirm
      renderShell={renderShell}
      type={T()}
      current={T({ id: 'b', name: 'Visa interview prep' })}
      onCancel={fn()}
      onConfirm={fn()}
    />
  ),
};
const vis = { renderShell, type: T(), onCancel: fn(), onConfirm: fn() };
export const Show: Story = { render: () => <VisibilityConfirm {...vis} show last={false} /> };
export const Hide: Story = {
  render: () => <VisibilityConfirm {...vis} show={false} last={false} />,
};
export const HideLast: Story = { render: () => <VisibilityConfirm {...vis} show={false} last /> };
// A long name wraps in the title rather than overflowing the small modal.
export const LongName: Story = {
  render: () => (
    <VisibilityConfirm
      {...vis}
      type={T({ name: 'Statement of purpose and personal history essay deep review' })}
      show
      last={false}
    />
  ),
};
