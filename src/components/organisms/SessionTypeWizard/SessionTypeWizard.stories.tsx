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
import { SessionTypeWizard, type Step } from './SessionTypeWizard';

/** The create / edit wizard (Session Types.dc.html, form view), one story per step and state. */
const meta: Meta = { title: 'Organisms/Session type wizard', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const TOPICS = [
  { slug: 'school-selection', label: 'School selection', id: 'o1' },
  { slug: 'visa-and-interview', label: 'Visa and interview', id: 'o2' },
  { slug: 'program-selection', label: 'Program selection', id: 'o3' },
  { slug: 'application-documents', label: 'Application documents', id: 'o4' },
  { slug: 'career-guidance', label: 'Career guidance', id: 'o5' },
  { slug: 'scholarships-and-funding', label: 'Scholarships & funding', id: 'o6' },
];
const DEFAULTS = { windowDays: 28, breakMin: 15, requiresApproval: true };
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
        topics: ['application-documents', 'school-selection', 'program-selection'],
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
