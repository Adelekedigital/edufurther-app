import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/components/atoms/Button/Button';
import { FloatingPill } from './FloatingPill';

/** The shared floating placement above the page (MatchPill, the profile's Book pill). */
const meta: Meta<typeof FloatingPill> = {
  title: 'Molecules/FloatingPill',
  component: FloatingPill,
  parameters: { layout: 'fullscreen' },
  args: {
    bottom: 'var(--space-6)',
    children: (
      <Button size="large" icon="event_available" style={{ borderRadius: 'var(--radius-full)' }}>
        Book a session
      </Button>
    ),
  },
  decorators: [(S) => <div style={{ minHeight: '100vh' }}>{S()}</div>],
};
export default meta;
type Story = StoryObj<typeof FloatingPill>;

export const Default: Story = {};
/** Docked to the bottom-right corner, clear of a centred pager. */
export const Corner: Story = { args: { dock: 'corner' } };
/** Above the phones' 56px tab bar. */
export const Narrow: Story = {
  args: { bottom: 'calc(56px + var(--space-4))' },
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};
/** A long label keeps clear of both edges. */
export const LongContent: Story = {
  args: {
    children: (
      <Button size="large" style={{ borderRadius: 'var(--radius-full)' }}>
        Book a free 1-on-1 call with someone from the EduFurther team today
      </Button>
    ),
  },
};
