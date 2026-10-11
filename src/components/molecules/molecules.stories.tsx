import { useState } from 'react';
import { addDays } from '@/lib/utils/slots';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { BookingStatus, PickableReason } from '@/types/booking';
import { AccountMenu } from './AccountMenu/AccountMenu';
import { AnswerItem } from './AnswerItem/AnswerItem';
import { AnswerPreview } from './AnswerPreview/AnswerPreview';
import { ReasonField } from './ReasonField/ReasonField';
import { BookingDayBadge } from './BookingDayBadge/BookingDayBadge';
import { BookingStatusTag } from './BookingStatusTag/BookingStatusTag';
import { DeadlinePill } from './DeadlinePill/DeadlinePill';
import { DayTimePicker } from './DayTimePicker/DayTimePicker';
import { EmptyState } from './EmptyState/EmptyState';
import { FactTile } from './FactTile/FactTile';
import { ChoiceChips } from './ChoiceChips/ChoiceChips';
import { CopyLinkButton } from './CopyLinkButton/CopyLinkButton';
import { DayHoursRow } from './DayHoursRow/DayHoursRow';
import { RowMenu } from './RowMenu/RowMenu';
import { FileField } from './FileField/FileField';
import { PersonalLinkPanel } from './PersonalLinkPanel/PersonalLinkPanel';
import { VideoProviderCard } from './VideoProviderCard/VideoProviderCard';
import { IconPicker } from './IconPicker/IconPicker';
import { QuestionRow } from './QuestionRow/QuestionRow';
import { SessionTypeOwnerFooter } from './SessionTypeOwnerFooter/SessionTypeOwnerFooter';
import { SessionPreviewCard } from './SessionPreviewCard/SessionPreviewCard';
import { SummarySection } from './SummarySection/SummarySection';
import { FormField } from './FormField/FormField';
import { Input, Textarea } from '@/components/atoms/Input/Input';
import { RadioCards } from './RadioCards/RadioCards';
import { SegmentedControl } from './SegmentedControl/SegmentedControl';
import { WizardSteps } from './WizardSteps/WizardSteps';
import { IconListItem } from './IconListItem/IconListItem';
import { MentorProof } from './MentorProof/MentorProof';
import { Notice } from './Notice/Notice';
import { OfflineBanner } from './OfflineBanner/OfflineBanner';
import { PageHero } from './PageHero/PageHero';
import { SearchField } from './SearchField/SearchField';
import { ShareMenu } from './ShareMenu/ShareMenu';
import { SocialLink } from './SocialLink/SocialLink';
import { StatTile } from './StatTile/StatTile';
import { SuggestionCountdown } from './SuggestionCountdown/SuggestionCountdown';
import { TimezonePicker } from './TimezonePicker/TimezonePicker';
import { TopicFilter } from './TopicFilter/TopicFilter';

const meta: Meta = { title: 'Molecules' };
export default meta;
type Story = StoryObj;

const TOPICS = [
  { slug: 'school-selection', label: 'School selection' },
  { slug: 'interview-preparation', label: 'Interview preparation' },
  { slug: 'document-preparation', label: 'Document preparation' },
  { slug: 'scholarships-financial-aid', label: 'Scholarships & financial aid' },
];

export const Filters: Story = {
  render: function Render() {
    const [sel, setSel] = useState(['document-preparation']);
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

/** Intake upload states (POST /me/intake-files): empty, uploading, attached, refused. */
export const FileFieldStates: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, maxWidth: 520 }}>
      <FileField label="Upload your current CV" required fileName={null} onFile={() => {}} />
      <FileField
        label="Upload your current CV"
        required
        fileName={null}
        status="uploading"
        pendingName="Adaeze-CV.pdf"
        onFile={() => {}}
      />
      <FileField
        label="Upload your current CV"
        required
        fileName="Adaeze-CV.pdf"
        onFile={() => {}}
      />
      <FileField
        label="Upload your current CV"
        required
        fileName={null}
        status="error"
        error="Upload a PDF or Word (.docx) file under 5 MB."
        onRetry={() => {}}
        onFile={() => {}}
      />
    </div>
  ),
};

/** Rail foot account menu (AppShell.dc.html). Open it to see the items. */
export const AccountMenuRail: Story = {
  render: () => (
    <div style={{ paddingTop: 200, paddingLeft: 24, background: 'var(--blue-50)', width: 88 }}>
      <AccountMenu
        avatar={{ initial: 'E', cover: 'lilac' }}
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

/** Session Types.dc.html: Price (fill, 200px) and Answer type (hug, with icons). */
export const Segmented: Story = {
  render: function Render() {
    const [price, setPrice] = useState<'free' | 'paid'>('free');
    const [kind, setKind] = useState<'text' | 'file'>('text');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SegmentedControl
          label="Price"
          width={200}
          value={price}
          onChange={setPrice}
          options={[
            { value: 'free', label: 'Free' },
            { value: 'paid', label: 'Paid' },
          ]}
        />
        <SegmentedControl
          label="Answer type"
          layout="hug"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'text', label: 'Short answer', icon: 'short_text' },
            { value: 'file', label: 'File upload', icon: 'upload_file' },
          ]}
        />
      </div>
    );
  },
};

/** Session Types.dc.html "When can mentees book this?". */
export const RadioCardGroup: Story = {
  render: function Render() {
    const [v, setV] = useState<'default' | 'custom'>('default');
    return (
      <div style={{ maxWidth: 840 }}>
        <RadioCards
          label="Hours for this session"
          value={v}
          onChange={setV}
          options={[
            {
              value: 'default',
              label: 'Use my Calendar availability',
              description:
                'Mentees book this session in the weekly hours you set in Calendar. Changes there apply here too.',
            },
            {
              value: 'custom',
              label: 'Set dedicated hours',
              description:
                'Offer this session only at its own times, e.g. evenings for visa prep. Your Calendar hours stay as they are.',
            },
          ]}
        />
      </div>
    );
  },
};

const WIZARD = ['Core details', 'Intake questions', 'Scheduling', 'Review'];
/** Create: on step 2 of a fresh flow — 3 and 4 locked. */
export const Steps: Story = {
  render: function Render() {
    const [cur, setCur] = useState(2);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 880 }}>
        <WizardSteps
          label="Create a session type"
          steps={WIZARD}
          current={cur}
          reached={2}
          onSelect={setCur}
        />
        <WizardSteps
          label="Edit session type"
          steps={WIZARD}
          current={4}
          reached={4}
          onSelect={fn()}
        />
        <WizardSteps
          label="Revisiting step 1"
          steps={WIZARD}
          current={1}
          reached={3}
          onSelect={fn()}
        />
      </div>
    );
  },
};

export const Fields: Story = {
  render: function Render() {
    const [desc, setDesc] = useState('');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
        <FormField
          label="Session name"
          hint="Be specific. Mentees scan this when comparing sessions."
        >
          {(f) => <Input {...f} fieldSize="md" placeholder="e.g. SOP draft review" />}
        </FormField>
        <FormField
          label="What mentees get"
          counter={`${desc.length} / 500`}
          hint="Say what they’ll leave with. Aim for 3–5 sentences."
        >
          {(f) => (
            <Textarea
              {...f}
              rows={4}
              maxLength={500}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Session name"
          error="Give your session a name."
          hint="Be specific. Mentees scan this when comparing sessions."
        >
          {(f) => <Input {...f} fieldSize="md" />}
        </FormField>
      </div>
    );
  },
};

/** Session Types topics (DS choice chips): at three, the rest are disabled. */
export const Choices: Story = {
  render: function Render() {
    const [sel, setSel] = useState(['document-preparation', 'school-selection']);
    return (
      <ChoiceChips
        label="Topics"
        max={3}
        selected={sel}
        onToggle={(v) => setSel((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))}
        options={TOPICS.map((t) => ({ value: t.slug, label: t.label }))}
      />
    );
  },
};

export const SessionIconPicker: Story = {
  render: function Render() {
    const [v, setV] = useState<'lightbulb' | null>(null);
    return (
      <div style={{ height: 320 }}>
        <IconPicker
          value={v}
          auto="edit_document"
          onChange={(x) => setV(x as 'lightbulb' | null)}
        />
      </div>
    );
  },
};

export const Questions: Story = {
  render: () => (
    <ol
      style={{
        listStyle: 'none',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxWidth: 840,
      }}
    >
      <QuestionRow
        num={1}
        text="Which programs are you applying to?"
        meta="Short answer · Required"
        icon="short_text"
        onDown={fn()}
        onEdit={fn()}
        onDelete={fn()}
      />
      <QuestionRow
        num={2}
        text="When do you start?"
        meta="Single choice (Fall 2027, Spring 2028) · Optional"
        icon="radio_button_checked"
        editing
        onUp={fn()}
        onDown={fn()}
        onEdit={fn()}
        onDelete={fn()}
      />
      <QuestionRow
        num={3}
        text="Upload your current SOP draft (PDF or Word)"
        meta="File upload · Optional"
        icon="upload_file"
        onUp={fn()}
        onEdit={fn()}
        onDelete={fn()}
      />
    </ol>
  ),
};

export const ReviewBlocks: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        maxWidth: 840,
      }}
    >
      <div style={{ flex: '1 1 360px' }}>
        <SummarySection
          title="Core details"
          onEdit={fn()}
          rows={[
            { k: 'Name', v: 'SOP draft review' },
            { k: 'Topics', v: 'Document preparation, School selection' },
            { k: 'Best for', v: 'Drafting' },
          ]}
        />
      </div>
      <SessionPreviewCard
        name="SOP draft review"
        description="We’ll work through your statement of purpose together. You’ll leave with a prioritized revision list."
        facts={['60 min', 'Document preparation', 'School selection']}
      />
    </div>
  ),
};

/** TimeSlots list rows: off, one slot, and two slots with an overlap. */
export const DayHours: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <DayHoursRow
        day="Monday"
        hours={{ on: false, slots: [[540, 600]] }}
        errors={[null]}
        onToggle={fn()}
        onSlot={fn()}
        onRemove={fn()}
        onAdd={fn()}
        onCopyAll={fn()}
      />
      <DayHoursRow
        day="Wednesday"
        hours={{ on: true, slots: [[1020, 1200]] }}
        errors={[null]}
        onToggle={fn()}
        onSlot={fn()}
        onRemove={fn()}
        onAdd={fn()}
        onCopyAll={fn()}
      />
      <DayHoursRow
        day="Thursday"
        hours={{
          on: true,
          slots: [
            [540, 780],
            [720, 840],
          ],
        }}
        errors={[
          'These hours overlap with another time on this day.',
          'These hours overlap with another time on this day.',
        ]}
        onToggle={fn()}
        onSlot={fn()}
        onRemove={fn()}
        onAdd={fn()}
        onCopyAll={fn()}
      />
    </div>
  ),
};

/** TimeSlots compact rows (the weekly-hours modal): off, one slot, two with an overlap. */
export const DayHoursCompact: Story = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      {(
        [
          ['Sunday', { on: false, slots: [[540, 600]] }, [null]],
          ['Monday', { on: true, slots: [[1020, 1200]] }, [null]],
          [
            'Saturday',
            {
              on: true,
              slots: [
                [540, 780],
                [720, 840],
              ],
            },
            [
              'These hours overlap with another time on this day.',
              'These hours overlap with another time on this day.',
            ],
          ],
        ] as const
      ).map(([day, hours, errors]) => (
        <DayHoursRow
          key={day}
          variant="compact"
          day={day}
          hours={{ on: hours.on, slots: hours.slots.map((s) => [...s] as [number, number]) }}
          errors={[...errors]}
          onToggle={fn()}
          onSlot={fn()}
          onRemove={fn()}
          onAdd={fn()}
          onCopyAll={fn()}
        />
      ))}
    </div>
  ),
};

/** Row "⋯" menu (Session Types.dc.html): open it; Delete is red, after a divider. */
export const RowActionsMenu: Story = {
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', maxWidth: 480, paddingBottom: 200 }}>
      <RowMenu
        label="More actions for SOP draft review"
        items={[
          { key: 'edit', icon: 'edit', label: 'Edit', onSelect: fn() },
          { key: 'dup', icon: 'content_copy', label: 'Duplicate', onSelect: fn() },
          { key: 'del', icon: 'delete', label: 'Delete', onSelect: fn(), danger: true },
        ]}
      />
    </div>
  ),
};

/** Copy share link: click for "Link copied" (the clipboard needs a secure context). */
export const CopyShareLink: Story = {
  render: () => (
    <div style={{ paddingTop: 48 }}>
      <CopyLinkButton
        label="Copy share link for SOP draft review"
        url="https://edufurther.com/mentors/m1?book=st1"
      />
    </div>
  ),
};

/** The owner's session card footer (Mentor Profile.dc.html): visible, Edit, Delete. */
export const SessionOwnerFooter: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <SessionTypeOwnerFooter name="SOP draft review" onHide={fn()} onEdit={fn()} onDelete={fn()} />
    </div>
  ),
};

/** Bookings.dc.html: how a past session ended. Six outcomes, three tones. */
export const BookingOutcomes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {(
        [
          'completed',
          'cancelled',
          'noShow',
          'declined',
          'expired',
          'withdrawn',
        ] as BookingStatus[]
      ).map((s) => (
        <BookingStatusTag key={s} status={s} />
      ))}
    </div>
  ),
};

/**
 * Bookings.dc.html: how long a pending request has left. One pill, both sides —
 * the mentor is told what to do, the mentee who it waits on.
 */
export const PendingDeadline: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {/* The mentor's side: theirs to answer. */}
      <DeadlinePill icon="timer" urgent>
        Respond within 30 min
      </DeadlinePill>
      <DeadlinePill icon="timer" urgent>
        Respond within 5h
      </DeadlinePill>
      <DeadlinePill icon="timer">Respond within 3 days</DeadlinePill>
      {/* The mentee's side: nothing to do but wait — until it is nearly too late. */}
      <DeadlinePill icon="hourglass_top">Waiting for Amara to confirm</DeadlinePill>
      <DeadlinePill icon="timer" urgent>
        Amara has 18h left to confirm
      </DeadlinePill>
    </div>
  ),
};

/** Bookings.dc.html: the day block at the head of a booking row. */
export const BookingDay: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      <BookingDayBadge startsAt="2026-10-04T16:00:00Z" timeZone="Africa/Lagos" />
      <BookingDayBadge startsAt="2026-12-25T09:00:00Z" timeZone="Africa/Lagos" />
      {/* The same instant, two zones, two days. */}
      <BookingDayBadge startsAt="2026-10-04T23:30:00Z" timeZone="Pacific/Auckland" />
    </div>
  ),
};

/**
 * Bookings.dc.html details panel: what the mentee answered on the booking form.
 * Every kind of answer, plus the two the design has no state for — a question
 * the mentor has since dropped, and a file retention has removed.
 */
export const BookingAnswers: Story = {
  render: () => {
    const base = {
      questionId: 'q',
      question: '',
      kind: 'free_text' as const,
      retired: false,
      answered: true,
      required: null,
      file: null,
    };
    const pdf = {
      id: 'f1',
      filename: 'SOP-draft-v2.pdf',
      contentType: 'application/pdf' as const,
      size: 182_400,
      available: true,
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: 380 }}>
        {/* Asked and left blank (backend #412). Here so the next change to
            AnswerItem can see the state — in the app it only appears behind
            particular mock bookings. */}
        <AnswerItem
          answer={{ ...base, question: 'What is your target intake?', answered: false, text: '' }}
        />
        <AnswerItem
          answer={{
            ...base,
            question: 'Upload your transcript',
            kind: 'file_upload',
            answered: false,
            required: true,
            text: '',
          }}
        />
        <AnswerItem
          answer={{
            ...base,
            question: 'What do you want to cover?',
            text: 'I need help reviewing my essays before the December deadline.',
          }}
        />
        {/* Long enough to prove the wrap, since the panel is 380px. */}
        <AnswerItem
          answer={{
            ...base,
            question: 'Anything else I should know?',
            text: 'I recently started my postgraduate scholarship application. I have attended several webinars and gathered useful information about the programs I am interested in, and I would like to talk about which of the nine on my list are realistic.',
          }}
        />
        <AnswerItem
          answer={{
            ...base,
            question: 'Where are you in your application?',
            kind: 'multi_choice',
            text: 'Shortlisting programs, First draft written',
          }}
        />
        <AnswerItem
          answer={{ ...base, question: 'Upload your draft or CV', kind: 'file_upload', text: pdf.filename, file: pdf }}
          onOpenFile={fn()}
        />
        <AnswerItem
          answer={{
            ...base,
            question: 'Attach anything you want me to read',
            kind: 'file_upload',
            text: 'shortlist.docx',
            file: { ...pdf, filename: 'shortlist.docx', available: false },
          }}
          onOpenFile={fn()}
        />
        <AnswerItem
          answer={{
            ...base,
            question: 'Which funding are you applying for?',
            retired: true,
            answered: true,
            required: null,
            text: 'Chevening, and the departmental scholarship if it reopens.',
          }}
        />
      </div>
    );
  },
};

/**
 * Bookings.dc.html: the booking form in brief, on a row. The question is the
 * one actually asked rather than a fixed label — a mentor whose form opens with
 * "Where are you in your application?" would otherwise have the answer
 * misattributed.
 */
export const BookingAnswerPreview: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 560 }}>
      <AnswerPreview
        preview={{
          count: 6,
          first: {
            question: 'What do you want to cover?',
            text: 'I have nine programs and need to cut it to five. Funding matters most.',
          },
        }}
        onOpenAll={fn()}
        controls="booking-details"
      />
      {/* Long enough to prove the two-line clamp. */}
      <AnswerPreview
        preview={{
          count: 4,
          first: {
            question: 'Anything else I should know?',
            text: 'I recently started my postgraduate scholarship application. I have attended several webinars and gathered useful information about the programs I am interested in, and I would like to talk about which of the nine on my list are realistic given my funding situation and the December deadline.',
          },
        }}
        onOpenAll={fn()}
        controls="booking-details"
      />
      {/* One answer: shown, with nothing more to open. */}
      <AnswerPreview
        preview={{ count: 1, first: { question: 'Attach your CV', text: 'CV-2026.docx' } }}
        onOpenAll={fn()}
        controls="booking-details"
      />
      {/* The hero's treatment: the link alone, since that card has no box. */}
      <AnswerPreview
        preview={{ count: 4, first: { question: 'What do you want to cover?', text: 'unused' } }}
        onOpenAll={fn()}
        controls="booking-details"
        linkOnly
      />
    </div>
  ),
};

/**
 * The reason on a decline, cancel or withdrawal. **Required** since
 * 2026-10-10, by the owner's decision, which overrode the contract's advice
 * that "a required one turns a clear-cut decision into a form to argue with".
 * One exemption, shown third: a mentor offering another time instead, where
 * the reason reverts to optional and says so.
 *
 * The codes are filtered by **side**, not action: a mentor is never offered
 * "I no longer need it", a mentee never "I'm no longer free". "Something else"
 * is the only one both may send, and it makes the note required — the second
 * field below, in its blocked state.
 */
export const Reason: Story = {
  render: function Render() {
    const [mentorCode, setMentorCode] = useState<PickableReason | null>(null);
    const [mentorText, setMentorText] = useState('');
    const [menteeCode, setMenteeCode] = useState<PickableReason | null>('mentee_no_longer_needed');
    const [menteeText, setMenteeText] = useState(
      'I found the answer in the webinar, so I no longer need the session. Sorry for the late notice.',
    );
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', maxWidth: 520 }}>
        <ReasonField
          side="mentor"
          reasonCode={mentorCode}
          onReasonCode={setMentorCode}
          text={mentorText}
          onText={setMentorText}
          readerFirstName="Amara"
          required
        />
        {/* "Something else" with nothing written: the one case where the note
            blocks the confirm too. The error only ever appears after a submit
            has been refused, so it is set here rather than derived. */}
        <ReasonField
          side="mentee"
          reasonCode="other"
          onReasonCode={fn()}
          text=""
          onText={fn()}
          readerFirstName="Natasha"
          required
          error={{ field: 'note', message: 'Say briefly what happened.' }}
        />
        <ReasonField
          side="mentee"
          reasonCode={menteeCode}
          onReasonCode={setMenteeCode}
          text={menteeText}
          onText={setMenteeText}
          readerFirstName="Natasha"
        />
      </div>
    );
  },
};

const HOLD_NOW = new Date('2026-10-05T12:00:00Z');
const heldIn = (minutes: number) => new Date(HOLD_NOW.getTime() + minutes * 60_000).toISOString();

/**
 * Ours: how long an offered time stays held for the mentee. The design has no
 * mentee-side view of a suggested time, so the pill is drawn to DeadlinePill's
 * spec — two countdowns on one screen should not read as two controls.
 *
 * Hours and minutes above the hour, minutes alone below it, words in the last
 * minute, and the hold's end rather than "0m". Warm under ten minutes.
 */
export const HoldCountdown: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <SuggestionCountdown heldUntil={heldIn(120)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(118)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(58)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(4)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(0.5)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(0)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(-90)} now={HOLD_NOW} />
      {/* No clock handed in: this one counts itself down. */}
      <SuggestionCountdown heldUntil={new Date(Date.now() + 4.4 * 60_000).toISOString()} />
    </div>
  ),
};

/** Integrations video cards: chosen, unchosen, and each kind of supporting line. */
export const VideoProviderCards: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <VideoProviderCard
        name="story"
        value="daily"
        checked
        onChange={fn()}
        icon="video_chat"
        tone="blue"
        label="EduFurther video"
        by="Built in · powered by Daily"
        description="A private room for each session. Mentees join from the browser with no account or download."
        benefit="Attendance is tracked, so every session counts in your session analytics."
        idleStatus="Ready to use"
        recommended
      />
      <VideoProviderCard
        name="story"
        value="google_meet"
        checked={false}
        onChange={fn()}
        icon="videocam"
        tone="green"
        label="Google Meet"
        by="Uses your Google account"
        description="A new Meet link for each booking, added to your invite and your mentee’s."
        note="Attendance isn’t tracked, so these sessions won’t count in your session analytics."
        idleStatus="Ready to use"
      />
    </div>
  ),
};

/** Personal meeting link: empty, in use, and a link that is not https. */
export const PersonalLinkPanels: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
      <PersonalLinkPanel
        value=""
        savedValue=""
        onChange={fn()}
        usingOwn={false}
        saving={false}
        error={null}
        onUse={fn()}
        onKeepAutomatic={fn()}
      />
      <PersonalLinkPanel
        value="https://meet.example.com/a-very-long-personal-room-name-that-wraps"
        savedValue="https://meet.example.com/a-very-long-personal-room-name-that-wraps"
        onChange={fn()}
        usingOwn
        saving={false}
        error={null}
        onUse={fn()}
        onKeepAutomatic={fn()}
      />
      <PersonalLinkPanel
        value="http://meet.example.com/room"
        savedValue=""
        onChange={fn()}
        usingOwn={false}
        saving={false}
        error={null}
        onUse={fn()}
        onKeepAutomatic={fn()}
      />
    </div>
  ),
};
