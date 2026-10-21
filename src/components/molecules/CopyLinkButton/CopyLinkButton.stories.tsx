import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CopyLinkButton } from './CopyLinkButton';

const meta: Meta<typeof CopyLinkButton> = {
  title: 'Molecules/CopyLinkButton',
  component: CopyLinkButton,
};
export default meta;
type Story = StoryObj;

export const CopyShareLink: Story = {
  render: () => (
    <div style={{ paddingTop: 48 }}>
      <CopyLinkButton
        label="Copy share link for SOP draft review"
        url="https://edufurther.com/mentors/m1?book=st1"
      />
    </div>
  ),
};

/** The owner's session card footer (Mentor Profile.dc.html): visible, Edit, Delete. */
