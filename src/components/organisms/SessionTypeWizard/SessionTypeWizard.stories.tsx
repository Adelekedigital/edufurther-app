import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SESSION_TEMPLATES } from '@/lib/utils/sessionTemplates';
import {
  blankDraft,
  draftFromTemplate,
  newKey,
  validateStep,
  type Draft,
  type FieldErrors,
} from '@/lib/utils/sessionTypeDraft';
import { BookingPreferencesForm } from './BookingPreferencesForm';
import { SessionTypeWizard, type Step } from './SessionTypeWizard';
import { WeeklyHoursForm } from './WeeklyHoursForm';

/** The create / edit wizard (Session Types.dc.html, form view), one story per step and state. */
const meta: Meta = { title: 'Organisms/Session type wizard', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const TOPICS = [
  { slug: 'school-selection', label: 'School selection', id: 'o1' },
  { slug: 'interview-preparation', label: 'Interview preparation', id: 'o2' },
  { slug: 'program-selection', label: 'Program selection', id: 'o3' },
  { slug: 'document-preparation', label: 'Document preparation', id: 'o4' },
  { slug: 'test-preparation', label: 'Test preparation', id: 'o5' },
  { slug: 'scholarships-financial-aid', label: 'Scholarships & financial aid', id: 'o6' },
];
// The design's sample defaults (sharedDefs): 60 min, 24 hrs, 2 weeks, 15 min, approve.
const DEFAULTS = {
  durationMin: 60,
  noticeHours: 24,
  windowDays: 14,
  breakMin: 15,
  requiresApproval: true,
};
// The design's sample Calendar hours (Mon, Tue, Thu, Fri 5–8 pm; Sat 9 am–1 pm).
const WEEKLY = {
  status: 'ready' as const,
  summary: 'Mon 5 pm–8 pm · Tue 5 pm–8 pm · Thu 5 pm–8 pm · Fri 5 pm–8 pm · Sat 9 am–1 pm',
  timeZone: 'Africa/Lagos',
};
const sop = () => draftFromTemplate(SESSION_TEMPLATES[0]!);

function Harness({
  start,
  step = 1,
  errors = {},
  formError = null,
}: {
  start: Draft;
  step?: Step;
  errors?: FieldErrors;
  formError?: string | null;
}) {
  const [d, setD] = useState(start);
  const [s, setS] = useState<Step>(step);
  return (
    <SessionTypeWizard
      title="Create a session type"
      step={s}
      reached={4}
      draft={d}
      update={(p) => setD((x) => ({ ...x, ...p }))}
      errors={errors}
      formError={formError}
      topics={TOPICS}
      autoIcon="edit_document"
      defaults={DEFAULTS}
      defaultsStatus="ready"
      onRetryDefaults={fn()}
      onEditDefaults={fn()}
      weekly={WEEKLY}
      onRetryWeekly={fn()}
      onEditWeekly={fn()}
      onStep={setS}
      onBack={() => setS((x) => (x > 1 ? ((x - 1) as Step) : x))}
      onNext={() => setS((x) => (x < 4 ? ((x + 1) as Step) : x))}
      finishLabel="Publish session"
      busy={false}
      onDeleteQuestion={fn()}
    />
  );
}

export const CoreDetailsBlank: Story = { render: () => <Harness start={blankDraft()} /> };
export const CoreDetailsErrors: Story = {
  render: () => <Harness start={blankDraft()} errors={validateStep(blankDraft(), 1)} />,
};
/** Three topics (the rest disabled) and a stage the mentor named. */
export const CoreDetailsFull: Story = {
  render: () => (
    <Harness
      start={{
        ...sop(),
        topics: ['document-preparation', 'school-selection', 'program-selection'],
        stage: 'other',
        customStage: 'Deferred admission',
        icon: 'lightbulb',
      }}
    />
  ),
};
export const IntakeQuestions: Story = { render: () => <Harness start={sop()} step={2} /> };
/** Five questions: the editor is hidden until one is removed or edited. */
export const IntakeQuestionsFull: Story = {
  render: () => (
    <Harness
      step={2}
      start={{
        ...sop(),
        questions: [
          {
            key: newKey(),
            text: 'Which programs are you applying to?',
            kind: 'free_text',
            required: true,
            options: [],
          },
          {
            key: newKey(),
            text: 'When do you start?',
            kind: 'single',
            required: false,
            options: ['Fall 2027', 'Spring 2028'],
          },
          {
            key: newKey(),
            text: 'Which areas worry you most?',
            kind: 'multi',
            required: false,
            options: ['Essays', 'Funding', 'Visa'],
          },
          {
            key: newKey(),
            text: 'Upload your current SOP draft (PDF or Word)',
            kind: 'file_upload',
            required: false,
            options: [],
          },
          {
            key: newKey(),
            text: 'Anything else I should know before we meet, including deadlines or offers you already hold?',
            kind: 'free_text',
            required: false,
            options: [],
          },
        ],
      }}
    />
  ),
};
export const IntakeQuestionsNone: Story = {
  render: () => <Harness start={{ ...sop(), questions: [] }} step={2} />,
};
export const SchedulingDefaults: Story = { render: () => <Harness start={sop()} step={3} /> };
/** Own rules, dedicated hours with an overlap and an end before its start. */
export const SchedulingCustom: Story = {
  render: () => {
    const d = {
      ...sop(),
      rules: 'custom' as const,
      windowDays: 14,
      breakMin: 30,
      hours: 'custom' as const,
      approval: 'off' as const,
    };
    d.days = d.days.map((x, i) =>
      i === 3
        ? {
            on: true,
            slots: [
              [1020, 1200],
              [1080, 1140],
            ] as [number, number][],
          }
        : i === 4
          ? { on: true, slots: [[600, 540]] as [number, number][] }
          : x,
    );
    return <Harness start={d} step={3} errors={validateStep(d, 3)} />;
  },
};
export const Review: Story = { render: () => <Harness start={sop()} step={4} /> };
export const ReviewPublishFailed: Story = {
  render: () => (
    <Harness
      start={sop()}
      step={4}
      formError="We couldn’t publish it. We couldn’t reach EduFurther. Try again."
    />
  ),
};

/** The Booking preferences modal's body; 20 days isn't a design option, so it's added. */
export const BookingPreferences: Story = {
  render: () => (
    <div style={{ maxWidth: 432 }}>
      <BookingPreferencesForm
        initial={{ ...DEFAULTS, windowDays: 20 }}
        saving={false}
        error={null}
        onCancel={fn()}
        onSave={fn()}
      />
    </div>
  ),
};
export const BookingPreferencesSaveFailed: Story = {
  render: () => (
    <div style={{ maxWidth: 432 }}>
      <BookingPreferencesForm
        initial={DEFAULTS}
        saving={false}
        error="Your preferences didn’t save. Try again in a moment."
        onCancel={fn()}
        onSave={fn()}
      />
    </div>
  ),
};

const WEEK = [
  { on: false, slots: [[540, 600]] },
  { on: true, slots: [[1020, 1200]] },
  { on: true, slots: [[1020, 1200]] },
  { on: false, slots: [[540, 600]] },
  { on: true, slots: [[1020, 1200]] },
  { on: true, slots: [[1020, 1200]] },
  { on: true, slots: [[540, 780]] },
] as { on: boolean; slots: [number, number][] }[];

/** The Your weekly hours modal's body (TimeSlots compact), zone named. */
export const WeeklyHours: Story = {
  render: () => (
    <div style={{ maxWidth: 512 }}>
      <WeeklyHoursForm
        initial={WEEK}
        timeZone="Africa/Lagos"
        saving={false}
        error={null}
        onCancel={fn()}
        onSave={fn()}
      />
    </div>
  ),
};
/** Hours in a second zone are named, not shown; a partial save failed. */
export const WeeklyHoursOtherZoneFailed: Story = {
  render: () => (
    <div style={{ maxWidth: 512 }}>
      <WeeklyHoursForm
        initial={WEEK}
        timeZone="Africa/Lagos"
        otherZones={['Europe/London']}
        saving={false}
        error="Some of your hours didn’t save. Check them, then try again."
        onCancel={fn()}
        onSave={fn()}
      />
    </div>
  ),
};
