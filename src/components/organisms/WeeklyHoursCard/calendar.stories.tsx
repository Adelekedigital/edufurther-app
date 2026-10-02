import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { BlockedDatesPanel } from '@/components/molecules/BlockedDatesPanel/BlockedDatesPanel';
import { MonthPicker } from '@/components/molecules/MonthPicker/MonthPicker';
import { Notice } from '@/components/molecules/Notice/Notice';
import { SettingSummaryRow } from '@/components/molecules/SettingSummaryRow/SettingSummaryRow';
import { StatusPill } from '@/components/molecules/StatusPill/StatusPill';
import { BlockOutForm } from '@/components/organisms/BlockOutForm/BlockOutForm';
import { SchedulingWindowForm } from '@/components/organisms/SchedulingWindowForm/SchedulingWindowForm';
import { emptyWeek, type DayHours } from '@/lib/utils/sessionTypeDraft';
import { WeeklyHoursCard } from './WeeklyHoursCard';

/** Calendar v2's pieces, each on its own (the page composes them). */
const meta: Meta = { title: 'Calendar', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

// The design's sample week: Monday 7–8 am, Saturday 2–3 am.
const sample = (): DayHours[] => {
  const d = emptyWeek();
  d[1] = { on: true, slots: [[420, 480]] };
  d[6] = { on: true, slots: [[120, 180]] };
  return d;
};

export const MonthAtAGlance: Story = {
  render: () => (
    <div style={{ maxWidth: 340 }}>
      <MonthPicker
        readOnly
        today="2026-09-26"
        selected={['2026-10-12', '2026-10-13', '2026-10-14']}
        booked={['2026-10-04', '2026-10-13']}
        available={[1, 6]}
        showLegend
      />
    </div>
  ),
};

export const MonthPickable: Story = {
  render: function Render() {
    const [sel, setSel] = useState(['2026-10-12', '2026-10-13']);
    return (
      <div style={{ maxWidth: 340 }}>
        <MonthPicker
          today="2026-09-26"
          selected={sel}
          booked={['2026-10-04']}
          onPick={(d) => setSel((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))}
          showLegend
        />
      </div>
    );
  },
};

export const Status: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <StatusPill tone="available" label="Available" hint="Open for new bookings" />
      <StatusPill tone="available" label="Available" hint="Open for new bookings" onChange={fn()} />
      <StatusPill tone="busy" label="Busy" hint="Back Sat, Oct 3" onChange={fn()} />
    </div>
  ),
};

export const SettingRow: Story = {
  render: () => (
    <div style={{ maxWidth: 1000 }}>
      <SettingSummaryRow
        icon="date_range"
        title="Scheduling window"
        summary="60 min sessions · at least 24 hours notice · up to 8 weeks ahead · 15 min break"
        actionLabel="Change scheduling window"
        onChange={fn()}
      />
    </div>
  ),
};

export const WeeklyHours: Story = {
  render: function Render() {
    const [days, setDays] = useState(sample);
    const [zone, setZone] = useState('America/New_York');
    return (
      <div style={{ maxWidth: 720 }}>
        <WeeklyHoursCard
          days={days}
          onDays={setDays}
          timeZone={zone}
          onTimeZone={setZone}
          deviceZone="Africa/Lagos"
        />
      </div>
    );
  },
};

export const WeeklyHoursEmptyAndOtherZone: Story = {
  render: function Render() {
    const [days, setDays] = useState(emptyWeek);
    return (
      <div style={{ maxWidth: 720 }}>
        <WeeklyHoursCard
          days={days}
          onDays={setDays}
          timeZone="Africa/Lagos"
          onTimeZone={fn()}
          deviceZone="Africa/Lagos"
          otherZones={['Europe/London']}
          note={
            <div style={{ marginTop: 8 }}>
              <Notice tone="info" icon="calendar_month">
                Mentees can find and book you once you set your weekly hours.
              </Notice>
            </div>
          }
        />
      </div>
    );
  },
};

export const WeeklyHoursErrors: Story = {
  render: function Render() {
    const [days, setDays] = useState(() => {
      const d = sample();
      d[3] = {
        on: true,
        slots: [
          [600, 540],
          [540, 720],
          [660, 780],
        ],
      };
      return d;
    });
    return (
      <div style={{ maxWidth: 720 }}>
        <WeeklyHoursCard
          days={days}
          onDays={setDays}
          timeZone="Africa/Lagos"
          onTimeZone={fn()}
          deviceZone="Africa/Lagos"
        />
      </div>
    );
  },
};

const DEFAULTS = {
  durationMin: 60,
  noticeHours: 24,
  windowDays: 14,
  breakMin: 15,
  requiresApproval: true,
  maxWindowDays: 56,
};

export const SchedulingWindow: Story = {
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <SchedulingWindowForm
        initial={DEFAULTS}
        days={sample()}
        saving={false}
        error={null}
        onCancel={fn()}
        onSave={fn()}
      />
    </div>
  ),
};

export const SchedulingWindowTooShortAndFailed: Story = {
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <SchedulingWindowForm
        initial={{ ...DEFAULTS, durationMin: 90, noticeHours: 30, maxWindowDays: 21 }}
        days={sample()}
        saving={false}
        error="Your preferences didn’t save. Try again in a moment."
        onCancel={fn()}
        onSave={fn()}
      />
    </div>
  ),
};

export const BlockedDates: Story = {
  render: function Render() {
    const [days, setDays] = useState(['2026-10-12', '2026-10-13', '2026-10-14']);
    return (
      <div style={{ maxWidth: 340 }}>
        <BlockedDatesPanel
          days={days}
          onEdit={fn()}
          onUnblock={(d) => setDays((s) => s.filter((x) => x !== d))}
        />
      </div>
    );
  },
};

export const BlockedDatesMany: Story = {
  render: () => (
    <div style={{ maxWidth: 340 }}>
      <BlockedDatesPanel
        days={Array.from({ length: 12 }, (_, i) => `2026-11-${String(i + 2).padStart(2, '0')}`)}
        onEdit={fn()}
        onUnblock={fn()}
      />
    </div>
  ),
};

export const BlockedDatesNone: Story = {
  render: () => (
    <div style={{ maxWidth: 340 }}>
      <BlockedDatesPanel days={[]} onEdit={fn()} onUnblock={fn()} />
    </div>
  ),
};

export const BlockOutModalBody: Story = {
  render: () => (
    <div style={{ maxWidth: 432 }}>
      <BlockOutForm
        today="2026-09-26"
        initial={['2026-10-12', '2026-10-13', '2026-10-14']}
        booked={[{ day: '2026-10-04', mentee: 'Taofeeq' }]}
        saving={false}
        error={null}
        onSave={fn()}
      />
    </div>
  ),
};

export const BlockOutConflictAndFailed: Story = {
  render: () => (
    <div style={{ maxWidth: 432 }}>
      <BlockOutForm
        today="2026-09-26"
        initial={['2026-10-04', '2026-10-06']}
        booked={[
          { day: '2026-10-04', mentee: 'Taofeeq' },
          { day: '2026-10-06', mentee: 'Ada' },
        ]}
        saving={false}
        error="Some of your dates didn’t save. Check them, then try again."
        onSave={fn()}
      />
    </div>
  ),
};
