import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FileField } from './FileField';

const meta: Meta<typeof FileField> = { title: 'Molecules/FileField', component: FileField };
export default meta;
type Story = StoryObj;

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
