import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { sampleParty } from '@/lib/utils/bookingTestFixtures';
import { AddToCalendarMenu } from './AddToCalendarMenu/AddToCalendarMenu';
import { DisclosureRow } from './DisclosureRow/DisclosureRow';
import { PresencePerson } from './PresencePerson/PresencePerson';
import { SessionClock } from './SessionClock/SessionClock';
import { SessionStatusPill } from './SessionStatusPill/SessionStatusPill';

/** Session Join.dc.html's building blocks, each in isolation. */
const meta: Meta = { title: 'Molecules/Session join' };
export default meta;
type Story = StoryObj;

/** Every tone the lobby uses; the live dot pulses unless motion is reduced. */
export const StatusPills: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <SessionStatusPill tone="blue" label="Upcoming" />
      <SessionStatusPill tone="blue" label="Starting soon" />
      <SessionStatusPill tone="green" label="In progress" live />
      <SessionStatusPill tone="neutral" label="Ended" />
      <SessionStatusPill tone="red" label="Missed" />
    </div>
  ),
};

export const ClockCountingDown: Story = {
  render: () => <SessionClock label="Starts in" value="1:45:00" sub="Join opens in 1:40:00" />,
};

export const ClockRunning: Story = {
  render: () => <SessionClock label="In session" value="12:00" sub="18 min left" />,
};

/** Here (green ring, pulse) beside away (grey), a long name, and a deleted account. */
export const Presence: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <PresencePerson
        person={sampleParty({ id: 'me', initials: 'GO', cover: 'sky' })}
        name="You"
        presence="Ready when you are"
        tone="away"
      />
      <PresencePerson person={sampleParty()} name="Amara" presence="Here now" tone="here" />
      <PresencePerson
        person={sampleParty({ id: 'long', initials: 'OA' })}
        name="Oluwadamilareoluwa"
        presence="Not here yet"
        tone="away"
      />
      <PresencePerson
        person={sampleParty({ id: 'gone', deleted: true, initials: '', name: 'Deleted user' })}
        name="Deleted user"
        presence="Not here yet"
        tone="away"
      />
    </div>
  ),
};

function Disclosure({ startOpen }: { startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div style={{ maxWidth: 640, border: '1px solid var(--ink-200)' }}>
      <DisclosureRow
        icon="checklist"
        title="Quick guide for a rewarding session"
        preview="3 tips · 1 min read"
        open={open}
        onToggle={() => setOpen((o) => !o)}
      >
        <span>Come with one clear goal.</span>
      </DisclosureRow>
    </div>
  );
}

export const DisclosureClosed: Story = { render: () => <Disclosure startOpen={false} /> };
export const DisclosureOpen: Story = { render: () => <Disclosure startOpen /> };

/** The design's "Add to calendar" link, opening Google, Outlook.com or a .ics file. */
export const AddToCalendar: Story = {
  render: () => (
    <div style={{ padding: 16, minHeight: 200 }}>
      <AddToCalendarMenu
        event={{
          id: 's1',
          title: '1:1 call with Amara Okafor',
          startsAt: '2026-10-04T17:00:00Z',
          endsAt: '2026-10-04T17:30:00Z',
          pageUrl: 'https://app.test/sessions/s1',
          venue: 'EduFurther video',
        }}
      />
    </div>
  ),
};
