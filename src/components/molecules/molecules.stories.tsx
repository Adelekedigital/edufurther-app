import { useState } from 'react';
import { addDays } from '@/lib/utils/slots';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { AccountMenu } from './AccountMenu/AccountMenu';
import { DayTimePicker } from './DayTimePicker/DayTimePicker';
import { EmptyState } from './EmptyState/EmptyState';
import { FactTile } from './FactTile/FactTile';
import { FileField } from './FileField/FileField';
import { IconListItem } from './IconListItem/IconListItem';
import { MentorProof } from './MentorProof/MentorProof';
import { Notice } from './Notice/Notice';
import { OfflineBanner } from './OfflineBanner/OfflineBanner';
import { PageHero } from './PageHero/PageHero';
import { SearchField } from './SearchField/SearchField';
import { ShareMenu } from './ShareMenu/ShareMenu';
import { SocialLink } from './SocialLink/SocialLink';
import { StatTile } from './StatTile/StatTile';
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
    // A week with two empty days (disabled, no dot).
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const date = addDays('2026-09-27', i);
      return {
        date,
        slots:
          i === 1 || i === 4
            ? []
            : [9, 13, 16].slice(0, 3 - (i % 3)).map((h) => ({ startsAt: `${date}T${h}:00:00Z` })),
      };
    });
    const [week, setWeek] = useState(0);
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
          week={{
            label: week === 0 ? 'Next 7 days · Sep 27 – Oct 3' : 'Oct 4 – Oct 10',
            canPrev: week > 0,
            canNext: week < 3,
            onPrev: () => setWeek(week - 1),
            onNext: () => setWeek(week + 1),
          }}
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

/** Rail foot account menu (AppShell.dc.html). Open it to see the items. */
export const AccountMenuRail: Story = {
  render: () => (
    <div style={{ paddingTop: 200, paddingLeft: 24, background: 'var(--blue-50)', width: 88 }}>
      <AccountMenu
        initial="E"
        items={[
          {
            key: 'matches',
            label: 'Find my mentor matches',
            icon: 'route',
            href: '#',
            external: true,
          },
          { key: 'logout', label: 'Logout', icon: 'logout', danger: true, onSelect: fn() },
        ]}
      />
    </div>
  ),
};

// ---- Mentor Profile pieces ---------------------------------------------------

export const ProfileListRows: Story = {
  render: () => (
    <div style={{ maxWidth: 560, border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
      <IconListItem
        icon="school"
        tone="blue"
        title="PhD, Sociology"
        meta="Mississippi State University · 2023 – 2027"
      />
      <IconListItem
        icon="workspace_premium"
        tone="gold"
        title="Graduate Teaching Assistantship with a very long title that has to wrap onto a second line"
        meta="Mississippi State University · 2021"
      />
      <IconListItem icon="school" tone="blue" title="MSc" />
    </div>
  ),
};

export const FactTiles: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        maxWidth: 600,
      }}
    >
      <FactTile icon="home_pin" tone="green" label="From" value="Nigeria" />
      <FactTile icon="school" tone="blue" label="Studied in" value="United States" />
      <FactTile icon="translate" tone="gold" label="Mentors in" value="English, Yoruba" />
    </div>
  ),
};

export const StatTiles: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: 400 }}>
      <StatTile icon="schedule" tone="gold" value="3,060 mins" label="mentoring time" />
      <StatTile icon="event_available" tone="blue" value="51" label="sessions completed" />
      <StatTile icon="groups" tone="green" value="27" label="mentees mentored" />
      <StatTile icon="verified_user" tone="neutral" value="88%" label="avg. attendance" />
    </div>
  ),
};

export const SocialLinks: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <SocialLink kind="linkedin" href="https://www.linkedin.com/in/example" />
      <SocialLink kind="x" href="https://x.com/example" />
      <SocialLink kind="youtube" href="https://www.youtube.com/@example" />
    </div>
  ),
};

export const Share: Story = {
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 400, minHeight: 200 }}>
      <ShareMenu url="https://edufurther.com/mentors/gbenga" name="Gbenga Elufisan" />
    </div>
  ),
};
