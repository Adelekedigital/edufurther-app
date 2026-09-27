import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { DayTimePicker } from './DayTimePicker/DayTimePicker';
import { EmptyState } from './EmptyState/EmptyState';
import { FileField } from './FileField/FileField';
import { MentorProof } from './MentorProof/MentorProof';
import { Notice } from './Notice/Notice';
import { OfflineBanner } from './OfflineBanner/OfflineBanner';
import { PageHero } from './PageHero/PageHero';
import { SearchField } from './SearchField/SearchField';
import { TimezonePicker } from './TimezonePicker/TimezonePicker';
import { TopicFilter } from './TopicFilter/TopicFilter';

const meta: Meta = { title: 'Molecules' };
export default meta;
type Story = StoryObj;

const TOPICS = [
  { slug: 'school-selection', label: 'School selection' },
  { slug: 'visa-and-interview', label: 'Visa and interview' },
  { slug: 'application-documents', label: 'Application documents' },
  { slug: 'scholarships-and-funding', label: 'Scholarships & funding' },
];

export const Filters: Story = {
  render: function Render() {
    const [sel, setSel] = useState(['application-documents']);
    const [q, setQ] = useState('');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
        <TopicFilter
          heading="What do you need help with?"
          topics={TOPICS}
          selected={sel}
          onToggle={(s) => setSel((c) => (c.includes(s) ? c.filter((x) => x !== s) : [...c, s]))}
          showClear={sel.length > 0 || !!q}
          onClear={() => {
            setSel([]);
            setQ('');
          }}
        />
        <SearchField
          label="Search mentors"
          placeholder="Search mentors by name, school or program"
          value={q}
          onChange={setQ}
          onClear={() => setQ('')}
        />
        <TopicFilter
          heading="Loading"
          topics={[]}
          selected={[]}
          onToggle={fn()}
          showClear={false}
          onClear={fn()}
          isLoading
        />
        <TopicFilter
          heading="Offline"
          topics={TOPICS}
          selected={sel}
          onToggle={fn()}
          showClear
          onClear={fn()}
          disabled
        />
      </div>
    );
  },
};

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

export const States: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
      <PageHero
        title="Find a mentor for your study-abroad journey"
        subtitle="Get guidance from mentors who have been through the process. Explore free 1:1 mentorship sessions."
      />
      <OfflineBanner />
      <Notice tone="neutral" icon="cloud_off" title="You’re offline.">
        These are mentors from your last visit.
      </Notice>
      <Notice tone="info" icon="refresh" title="The list was updated." onDismiss={fn()}>
        We’ve started you back at the top.
      </Notice>
      <EmptyState
        illustration="search-results"
        title="No mentors match that"
        description="Try other topics to see more mentors."
      />
    </div>
  ),
};

export const Booking: Story = {
  render: function Render() {
    const [zone, setZone] = useState('Africa/Lagos');
    const [day, setDay] = useState(0);
    const [time, setTime] = useState<string | null>(null);
    const [file, setFile] = useState<string | null>(null);
    const days = [0, 1, 2, 3, 4].map((i) => ({
      date: `2026-09-${28 + i}`,
      slots: [9, 13, 16]
        .slice(0, 3 - (i % 3))
        .map((h) => ({ startsAt: `2026-09-${28 + i}T${h}:00:00Z` })),
    }));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
        <TimezonePicker value={zone} onChange={setZone} deviceZone="Europe/London" />
        <DayTimePicker
          days={days}
          dayIndex={day}
          onDayChange={setDay}
          time={time}
          onTimeChange={setTime}
          timeZone={zone}
        />
        <FileField
          label="Upload your current CV"
          required
          fileName={file}
          onFile={(f) => setFile(f?.name ?? null)}
        />
      </div>
    );
  },
};
