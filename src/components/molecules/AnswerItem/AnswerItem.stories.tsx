import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { AnswerItem } from './AnswerItem';

const meta: Meta<typeof AnswerItem> = { title: 'Molecules/AnswerItem', component: AnswerItem };
export default meta;
type Story = StoryObj;

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
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: 380 }}
      >
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
          answer={{
            ...base,
            question: 'Upload your draft or CV',
            kind: 'file_upload',
            text: pdf.filename,
            file: pdf,
          }}
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
