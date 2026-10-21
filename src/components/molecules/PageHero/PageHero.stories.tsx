import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PageHero } from './PageHero';

const meta: Meta<typeof PageHero> = { title: 'Molecules/PageHero', component: PageHero };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <PageHero
      title="Find a mentor for your study-abroad journey"
      subtitle="Get guidance from mentors who have been through the process. Explore free 1:1 mentorship sessions."
    />
  ),
};
