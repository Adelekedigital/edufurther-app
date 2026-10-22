import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BookingModeLabel } from './BookingModeLabel';

const meta: Meta<typeof BookingModeLabel> = {
  title: 'Molecules/BookingModeLabel',
  component: BookingModeLabel,
};
export default meta;
type Story = StoryObj;

/** Both modes, at the 12px the session cards set. */
export const Modes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-p-xs)' }}>
      <BookingModeLabel requiresConfirmation />
      <BookingModeLabel requiresConfirmation={false} />
    </div>
  ),
};
