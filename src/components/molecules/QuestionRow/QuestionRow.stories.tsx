import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { QuestionRow } from './QuestionRow';

const meta: Meta<typeof QuestionRow> = { title: 'Molecules/QuestionRow', component: QuestionRow };
export default meta;
type Story = StoryObj;

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
