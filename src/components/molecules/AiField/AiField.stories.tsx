import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AiField, type AssistMode } from './AiField';

const meta: Meta = { title: 'Molecules/AiField' };
export default meta;
type Story = StoryObj;

const DRAFT =
  'I moved from Nigeria to a fully funded PhD in Sociology at Mississippi State. I help with statements of purpose, school selection and scholarships.';
const NOTE = 'We drafted this from your profile information. You can tweak it in your own words.';

function Field({
  initial = '',
  drafted = false,
  assist = 'ok',
  draftNote,
  max = 600,
}: {
  initial?: string;
  drafted?: boolean;
  /** ok: answers after 0.9 s; slow: never answers (the working state); limit / down: fails. */
  assist?: 'ok' | 'slow' | 'limit' | 'down' | 'none';
  draftNote?: string;
  max?: number;
}) {
  const [text, setText] = useState(initial);
  const [isDraft, setIsDraft] = useState(drafted);
  const onAssist =
    assist === 'none'
      ? undefined
      : (mode: AssistMode, current: string) =>
          new Promise<string>((resolve, reject) => {
            if (assist === 'slow') return;
            setTimeout(() => {
              if (assist === 'limit')
                reject(new Error('You’ve used today’s writing help. Try again tomorrow.'));
              else if (assist === 'down')
                reject(new Error('Writing help isn’t available right now. Try again later.'));
              else resolve(mode === 'draft' ? DRAFT : `${current.trim()}.`);
            }, 900);
          });
  return (
    <div style={{ maxWidth: 520 }}>
      <AiField
        label="About"
        value={text}
        drafted={isDraft}
        onChange={(t, m) => {
          setText(t);
          setIsDraft(m.drafted);
        }}
        max={max}
        rows={6}
        hint="Lead with the path you’ve walked."
        placeholder="Your path, what you studied and what you can help with."
        draftNote={draftNote}
        onAssist={onAssist}
      />
    </div>
  );
}

export const Empty: Story = { render: () => <Field /> };
export const OwnText: Story = { render: () => <Field initial="i help with scholarships" /> };
export const Working: Story = { render: () => <Field assist="slow" /> };
export const UntouchedDraft: Story = { render: () => <Field initial={DRAFT} drafted /> };
export const UntouchedDraftWithNote: Story = {
  render: () => <Field initial={DRAFT} drafted draftNote={NOTE} />,
};
export const DailyLimit: Story = { render: () => <Field initial="my text" assist="limit" /> };
export const Unavailable: Story = { render: () => <Field initial="my text" assist="down" /> };
export const AtTheLimit: Story = { render: () => <Field initial={'x'.repeat(300)} max={300} /> };
export const Plain: Story = { render: () => <Field initial="No assist here." assist="none" /> };
