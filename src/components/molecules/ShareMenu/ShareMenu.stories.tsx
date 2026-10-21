import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ShareMenu } from './ShareMenu';

const meta: Meta<typeof ShareMenu> = { title: 'Molecules/ShareMenu', component: ShareMenu };
export default meta;
type Story = StoryObj;

export const Share: Story = {
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 400, minHeight: 200 }}>
      <ShareMenu url="https://edufurther.com/mentors/gbenga" name="Gbenga Elufisan" />
    </div>
  ),
};

/** Session Types.dc.html: Price (fill, 200px) and Answer type (hug, with icons). */
