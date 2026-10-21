import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MentorProof } from './MentorProof';

const meta: Meta<typeof MentorProof> = { title: 'Molecules/MentorProof', component: MentorProof };
export default meta;
type Story = StoryObj;

export const Proof: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <MentorProof rating={4.9} reviewCount={11} completedSessions={23} />
      <MentorProof rating={null} reviewCount={0} completedSessions={0} />
      <MentorProof rating={null} reviewCount={0} completedSessions={2} />
      <MentorProof rating={null} reviewCount={0} completedSessions={12} />
    </div>
  ),
};
