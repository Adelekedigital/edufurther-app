import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { AnswerPreview } from './AnswerPreview';

const meta: Meta<typeof AnswerPreview> = {
  title: 'Molecules/AnswerPreview',
  component: AnswerPreview,
};
export default meta;
type Story = StoryObj;

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
