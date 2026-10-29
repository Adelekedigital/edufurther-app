import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { FileCard } from './FileCard';

const meta: Meta<typeof FileCard> = { title: 'Molecules/FileCard', component: FileCard };
export default meta;
type Story = StoryObj;

/** Theirs (grey, on a white bubble) and mine (white, on a blue-50 bubble). */
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
      <div style={{ padding: 12, background: 'var(--white)', border: '1px solid var(--ink-200)' }}>
        <FileCard
          name="Personal_statement_v3.pdf"
          sizeBytes={245760}
          contentType="application/pdf"
          label="View Personal_statement_v3.pdf"
          tone="theirs"
          onOpen={fn()}
        />
      </div>
      <div style={{ padding: 12, background: 'var(--blue-50)' }}>
        <FileCard
          name="Interview_prep_checklist_with_a_very_long_name.docx"
          sizeBytes={98304}
          contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          label="View Interview_prep_checklist_with_a_very_long_name.docx"
          tone="mine"
          onOpen={fn()}
        />
      </div>
    </div>
  ),
};
