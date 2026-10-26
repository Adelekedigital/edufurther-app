import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DateChip } from '@/components/molecules/DateChip/DateChip';
import { DashboardNextSession } from './DashboardNextSession';

const meta: Meta<typeof DashboardNextSession> = {
  title: 'Organisms/DashboardNextSession',
  component: DashboardNextSession,
};
export default meta;
type Story = StoryObj<typeof DashboardNextSession>;

const body = (
  <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px 20px' }}>
    <DateChip iso="2026-10-04T12:00:00Z" timeZone="Africa/Lagos" />
    <span>Statement of Purpose Review</span>
  </div>
);

/** The frame as its own card; each home screen fills the body. */
export const Card: Story = { args: { children: body } };

/** With a control before "All bookings" (the mentee's Tips). */
export const WithHeadActions: Story = {
  args: { children: body, headActions: <button type="button">Tips</button> },
};

/** The band inside the new-mentor hero: an h3, no border of its own. */
export const Hero: Story = { args: { variant: 'hero', children: body } };
