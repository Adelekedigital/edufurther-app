import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '@/components/atoms/Button/Button';
import { SideDrawer } from './SideDrawer';

/** A details panel over the page from the right (Admin.dc.html drawers). */
const meta: Meta<typeof SideDrawer> = {
  title: 'Templates/Side drawer',
  component: SideDrawer,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    title: 'Credits for Amara Okafor',
    onClose: fn(),
    header: <h2 style={{ margin: 0 }}>Amara Okafor</h2>,
    children: <p style={{ margin: 0 }}>Balance and history go here.</p>,
  },
};
export default meta;
type Story = StoryObj<typeof SideDrawer>;

/** 520px: the admin credits panel opened from the Credit log. */
export const Medium: Story = {};

/** 560px with a pinned footer: the admin mentor detail. */
export const LargeWithFooter: Story = {
  args: {
    width: 'lg',
    title: 'Tolu Bakare',
    header: <h2 style={{ margin: 0 }}>Tolu Bakare</h2>,
    children: <div style={{ height: 1400 }}>A long application.</div>,
    footer: (
      <>
        <Button size="medium" variant="secondary-outlined">
          Not approved
        </Button>
        <Button size="medium">Approve</Button>
      </>
    ),
  },
};

/** A very long name wraps in the header rather than pushing Close out. */
export const LongName: Story = {
  args: {
    header: (
      <h2 style={{ margin: 0, overflowWrap: 'anywhere' }}>
        Oluwaseun Adebayo-Williamson Okonkwo-Fashola
      </h2>
    ),
  },
};
