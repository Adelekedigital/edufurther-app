import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SaveBar } from './SaveBar';

/** The explicit-save bar, pinned at the bottom of the screen (Mentee Settings.dc.html `showSaveBar`). */
const meta: Meta<typeof SaveBar> = {
  title: 'Molecules/SaveBar',
  component: SaveBar,
  parameters: { layout: 'fullscreen' },
  args: {
    message: 'Unsaved changes to your profile',
    label: 'Unsaved changes',
    discardLabel: 'Discard',
    saveLabel: 'Save changes',
    savingLabel: 'Saving…',
    onDiscard: fn(),
    onSave: fn(),
  },
  decorators: [(S) => <div style={{ minHeight: '100vh' }}>{S()}</div>],
};
export default meta;
type Story = StoryObj<typeof SaveBar>;

export const Default: Story = {};
/** Save was tried with required fields missing. */
export const WithFormError: Story = { args: { error: 'Fill in the required fields to continue.' } };
/** The save is running: both actions hold until it answers. */
export const Saving: Story = { args: { saving: true } };
