import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { InviteWelcome } from './InviteWelcome';

const meta: Meta<typeof InviteWelcome> = {
  title: 'Organisms/InviteWelcome',
  component: InviteWelcome,
  args: {
    inviter: { firstName: 'Damilola', photoUrl: null, tone: 'rose' },
    schools: [
      'University of Oxford',
      'University of Edinburgh',
      'University of Toronto',
      'Carnegie Mellon University',
      'TU Munich',
    ],
    signUpHref: '/signup',
    browseHref: '/explore',
  },
  render: (args) => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 24px 48px' }}>
      <InviteWelcome {...args} />
    </div>
  ),
};
export default meta;
type Story = StoryObj<typeof InviteWelcome>;

/** Invite Landing.dc.html saved defaults: a valid link. */
export const Invite: Story = {};

/** `inviter: null`: an unknown, revoked or claimed code. */
export const Broken: Story = { args: { inviter: null } };

/** Fewer than 4 schools, or a failed read: the page passes none. */
export const NoSchools: Story = { args: { schools: null } };

/** A long first name wraps in the H1 and the kicker. */
export const LongName: Story = {
  args: { inviter: { firstName: 'Oluwadamilolaoluwaseun', photoUrl: null, tone: 'sage' } },
};
