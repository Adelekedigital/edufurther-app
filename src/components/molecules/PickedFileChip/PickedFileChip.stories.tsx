import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { PickedFileChip } from './PickedFileChip';

const meta: Meta<typeof PickedFileChip> = {
  title: 'Molecules/PickedFileChip',
  component: PickedFileChip,
};
export default meta;
type Story = StoryObj;

const FILE = {
  id: 'f1',
  name: 'Amara_Okafor_CV.pdf',
  sizeBytes: 312 * 1024,
  contentType: 'application/pdf',
};

/** Filled (SendMessage), outlined (the Messages composer), and uploading. */
export const Looks: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
      <PickedFileChip file={FILE} uploading={null} onView={fn()} onRemove={fn()} look="filled" />
      <PickedFileChip file={FILE} uploading={null} onView={fn()} onRemove={fn()} look="outlined" />
      <PickedFileChip
        file={null}
        uploading="Interview_prep.docx"
        onView={fn()}
        onRemove={fn()}
        look="outlined"
      />
    </div>
  ),
};
