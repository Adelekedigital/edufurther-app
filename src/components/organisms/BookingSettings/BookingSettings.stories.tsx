import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { BookingSettings, type BookingSettingsValue } from './BookingSettings';

/** Mentor Settings.dc.html, the Booking tab (`isBooking`). */
const meta: Meta = { title: 'Settings/Mentor booking', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const start: BookingSettingsValue = {
  requiresApproval: true,
  durationMin: 60,
  noticeHours: 24,
  windowDays: 14,
  breakMin: 15,
};

function Live({ initial, count }: { initial: BookingSettingsValue; count: number | null }) {
  const [v, setV] = useState(initial);
  return (
    <BookingSettings
      state="ready"
      value={v}
      onChange={setV}
      maxWindowDays={56}
      sessionsUsingRules={count}
    />
  );
}

export const ApprovalOn: Story = { render: () => <Live initial={start} count={2} /> };

export const ApprovalOff: Story = {
  render: () => <Live initial={{ ...start, requiresApproval: false }} count={1} />,
};

/** Values set elsewhere (21 days, 36 hours) stay shown, not the first option. */
export const ValuesOutsideTheChoices: Story = {
  render: () => <Live initial={{ ...start, windowDays: 21, noticeHours: 36 }} count={0} />,
};

export const Saving: Story = {
  render: () => (
    <BookingSettings state="ready" value={start} onChange={fn()} sessionsUsingRules={2} disabled />
  ),
};

export const Loading: Story = { render: () => <BookingSettings state="loading" /> };

export const LoadFailed: Story = {
  render: () => <BookingSettings state="error" onRetry={fn()} />,
};

export const Phone: Story = {
  globals: { viewport: { value: 'mobile1' } },
  render: () => <Live initial={start} count={2} />,
};
