import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { AccountMenu } from './AccountMenu';

const meta: Meta<typeof AccountMenu> = { title: 'Molecules/AccountMenu', component: AccountMenu };
export default meta;
type Story = StoryObj;

export const AccountMenuRail: Story = {
  render: () => (
    <div style={{ paddingTop: 200, paddingLeft: 24, background: 'var(--blue-50)', width: 88 }}>
      <AccountMenu
        avatar={{ initials: 'E', cover: 'lilac' }}
        items={[
          {
            key: 'matches',
            label: 'Talk to our team',
            icon: 'support_agent',
            href: '#',
            external: true,
          },
          { key: 'logout', label: 'Logout', icon: 'logout', danger: true, onSelect: fn() },
        ]}
      />
    </div>
  ),
};

// ---- Mentor Profile pieces ---------------------------------------------------
