import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SocialLink } from './SocialLink';

const meta: Meta<typeof SocialLink> = { title: 'Molecules/SocialLink', component: SocialLink };
export default meta;
type Story = StoryObj;

export const SocialLinks: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <SocialLink mark="linkedin" href="https://www.linkedin.com/in/example" />
      <SocialLink mark="x" href="https://x.com/example" />
      <SocialLink mark="youtube" href="https://www.youtube.com/@example" />
      <SocialLink mark="instagram" href="https://www.instagram.com/example" />
      <SocialLink mark="facebook" href="https://www.facebook.com/example" />
      <SocialLink mark="tiktok" href="https://www.tiktok.com/@example" />
      <SocialLink mark="medium" href="https://example.medium.com" />
      <SocialLink mark="substack" href="https://example.substack.com" />
      <SocialLink mark="website" href="https://example.com" />
    </div>
  ),
};
