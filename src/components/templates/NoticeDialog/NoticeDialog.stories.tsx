import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { PREVIEW_COPY } from '@/lib/copy/preview';
import { NoticeDialog } from './NoticeDialog';

const readOnly = PREVIEW_COPY.readOnly.body('Staging');

/**
 * Something happened and there's nothing to decide (Modal.dc.html confirm,
 * size sm, one full-width button): Preview as user's notices.
 */
const meta: Meta<typeof NoticeDialog> = {
  title: 'Templates/Notice dialog',
  component: NoticeDialog,
  args: { okLabel: 'Got it', onClose: fn() },
};
export default meta;
type Story = StoryObj<typeof NoticeDialog>;

/** A write the admin pressed in preview was refused. */
export const ReadOnly: Story = {
  args: {
    title: PREVIEW_COPY.readOnly.title,
    icon: 'visibility',
    children: (
      <>
        {readOnly.before}
        <strong>Amara Okafor</strong>
        {readOnly.after}
      </>
    ),
  },
};

/** The server ended the preview after 30 idle minutes. */
export const PreviewEnded: Story = {
  args: {
    title: PREVIEW_COPY.ended.title,
    icon: 'timer_off',
    children: PREVIEW_COPY.ended.body('Amara Okafor', 'idle'),
  },
};

/** The 2-hour cap. */
export const PreviewEndedCap: Story = {
  args: {
    title: PREVIEW_COPY.ended.title,
    icon: 'timer_off',
    children: PREVIEW_COPY.ended.body('Amara Okafor', 'max_length'),
  },
};

/** Phones: a bottom sheet, like every confirm. */
export const Phone: Story = {
  ...PreviewEnded,
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};
