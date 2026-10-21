import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { RowMenu } from './RowMenu';

const meta: Meta<typeof RowMenu> = { title: 'Molecules/RowMenu', component: RowMenu };
export default meta;
type Story = StoryObj;

export const RowActionsMenu: Story = {
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 480, paddingBottom: 200 }}>
      <RowMenu
        label="More actions for SOP draft review"
        items={[
          { key: 'edit', icon: 'edit', label: 'Edit', onSelect: fn() },
          { key: 'dup', icon: 'content_copy', label: 'Duplicate', onSelect: fn() },
          { key: 'del', icon: 'delete', label: 'Delete', onSelect: fn(), danger: true },
        ]}
      />
    </div>
  ),
};

/** Copy share link: click for "Link copied" (the clipboard needs a secure context). */
