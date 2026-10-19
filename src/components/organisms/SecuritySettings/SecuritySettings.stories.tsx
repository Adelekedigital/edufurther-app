import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type ReactNode } from 'react';
import { fn, userEvent, within } from 'storybook/test';
import { SecuritySettings, type DeleteShell, type SecuritySettingsProps } from './SecuritySettings';

// Organism stories can't import ModalShell (a template), so this stand-in
// frame is the modal's sm size and padding, with its title; the page renders
// the real ModalShell (icon, tone, phone sheet), seen on /settings/security.
const renderShell = (s: DeleteShell, body: ReactNode) => (
  <div
    role="alertdialog"
    aria-label={s.title}
    style={{
      maxWidth: 400,
      marginTop: 24,
      padding: 'var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      border: 'var(--border-hairline) solid var(--border-subtle)',
      borderRadius: 'var(--radius-2xl)',
      background: 'var(--surface-card)',
    }}
  >
    <h2 style={{ margin: 0, fontSize: 'var(--text-p-lg)' }}>{s.title}</h2>
    {body}
  </div>
);

/** Settings › Login and security (SecuritySettings.dc.html, auth=passwordless). */
const meta: Meta<typeof SecuritySettings> = {
  title: 'Organisms/Security settings',
  component: SecuritySettings,
  args: {
    role: 'mentee',
    name: 'Amara Okafor',
    email: 'amara.okafor@gmail.com',
    verified: true,
    provider: 'email',
    upcomingCount: 2,
    requestCount: 1,
    deleteOpen: false,
    deleting: false,
    deleteError: null,
    onDelete: fn(),
    onDeleteOpenChange: fn(),
  },
  // The page's frame, as SecurityPanel draws it; open state kept here.
  render: function Render(args: SecuritySettingsProps) {
    const [open, setOpen] = useState(args.deleteOpen);
    return (
      <SecuritySettings
        {...args}
        deleteOpen={open}
        onDeleteOpenChange={(o) => {
          setOpen(o);
          args.onDeleteOpenChange(o);
        }}
        renderShell={renderShell}
      />
    );
  },
};
export default meta;
type Story = StoryObj<typeof SecuritySettings>;

/** Logs in with the email code. */
export const Email: Story = {};
/** Logs in with Google; the code works too. */
export const Google: Story = { args: { provider: 'google' } };
/** Mentor Settings' copy (mentors don't reach this tab yet). */
export const Mentor: Story = { args: { role: 'mentor', upcomingCount: 1, requestCount: 0 } };
export const Unverified: Story = { args: { verified: false } };
export const LongEmail: Story = {
  args: { email: 'oluwaseun.adebayo-williams.applications2027@university-mail.example.com' },
};
export const DeleteModalOpen: Story = { args: { deleteOpen: true } };
/** No upcoming sessions: the session sentence is left out. */
export const DeleteNoSessions: Story = {
  args: { deleteOpen: true, upcomingCount: 0, requestCount: 0 },
};
/** DELETE typed: "Delete my account" is on. */
export const DeleteTyped: Story = {
  args: { deleteOpen: true },
  play: async () => {
    await userEvent.type(within(document.body).getByLabelText('Type DELETE to confirm'), 'DELETE');
  },
};
export const Deleting: Story = { args: { deleteOpen: true, deleting: true } };
export const DeleteFailed: Story = {
  args: {
    deleteOpen: true,
    deleteError: 'We couldn’t delete your account. Nothing has changed. Try again.',
  },
};
