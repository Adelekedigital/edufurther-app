import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { FileViewer } from './FileViewer';

/** A shared file, read in the app (FileViewer.dc.html, Modal list xl). */
const meta: Meta<typeof FileViewer> = {
  title: 'Templates/File viewer',
  component: FileViewer,
  args: {
    name: 'Amara_Okafor_SOP_draft.pdf',
    contentType: 'application/pdf',
    size: 240 * 1024,
    sharedBy: { mine: false, firstName: 'Amara' },
    url: null,
    isLoading: false,
    error: null,
    onRetry: fn(),
    onClose: fn(),
  },
};
export default meta;
type Story = StoryObj<typeof FileViewer>;

export const Loading: Story = { args: { isLoading: true } };
export const Word: Story = {
  args: {
    name: 'CV-2026.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    url: 'blob:story',
    sharedBy: { mine: true },
  },
};
export const Failed: Story = {
  args: { error: { kind: 'server', message: 'x' } },
};
/** Intake retention removed it: the caller's line, no Download. */
export const Unavailable: Story = {
  args: {
    unavailable:
      'This file is no longer available. Uploads are kept for a while after a session, then removed.',
  },
};
