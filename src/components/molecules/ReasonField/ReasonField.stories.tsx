import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ReasonField } from './ReasonField';
import type { BookingStatus, PickableReason } from '@/types/booking';

const meta: Meta<typeof ReasonField> = { title: 'Molecules/ReasonField', component: ReasonField };
export default meta;
type Story = StoryObj;

export const Reason: Story = {
  render: function Render() {
    const [mentorCode, setMentorCode] = useState<PickableReason | null>(null);
    const [mentorText, setMentorText] = useState('');
    const [menteeCode, setMenteeCode] = useState<PickableReason | null>('mentee_no_longer_needed');
    const [menteeText, setMenteeText] = useState(
      'I found the answer in the webinar, so I no longer need the session. Sorry for the late notice.',
    );
    return (
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', maxWidth: 520 }}
      >
        <ReasonField
          side="mentor"
          label="Reason for canceling"
          placeholder="Let the mentee know why you are canceling this call…"
          reasonCode={mentorCode}
          onReasonCode={setMentorCode}
          text={mentorText}
          onText={setMentorText}
          readerFirstName="Amara"
        />
        {/* "Something else" with nothing written: the one case where the note
            blocks the confirm too. The error only ever appears after a submit
            has been refused, so it is set here rather than derived. */}
        <ReasonField
          side="mentee"
          label="Reason for withdrawing"
          placeholder="Let your mentor know why you are canceling…"
          reasonCode="other"
          onReasonCode={fn()}
          text=""
          onText={fn()}
          readerFirstName="Natasha"
          error={{ field: 'note', message: 'Say briefly what happened.' }}
        />
        {/* The label is the caller's, so a declining mentor reads a different
            word for the same field. */}
        <ReasonField
          side="mentee"
          label="Reason for declining"
          placeholder="Let your mentor know why you are canceling…"
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
