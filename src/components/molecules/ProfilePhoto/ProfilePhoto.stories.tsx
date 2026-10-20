import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ProfilePhoto } from './ProfilePhoto';

/** A photo that loads in Storybook without the network. */
const PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="lightsteelblue"/><circle cx="50" cy="30" r="16" fill="slategray"/></svg>',
  );

const upload = {
  accept: 'image/jpeg,image/png,image/webp',
  upload: fn(),
  uploading: false,
  error: null,
  errorFrom: null,
  dismissError: fn(),
  remove: fn(),
  removing: false,
  removedStamp: 0,
};

const meta: Meta<typeof ProfilePhoto> = {
  title: 'Molecules/Profile photo',
  component: ProfilePhoto,
  args: {
    size: 112,
    person: { initials: 'EG', cover: 'sky', src: PHOTO, focus: null, name: 'Elufisan Ganiyu' },
    upload,
    onRemove: fn(),
  },
  render: (args) => (
    <div style={{ padding: 24, minHeight: 260 }}>
      <ProfilePhoto {...args} />
    </div>
  ),
};
export default meta;
type Story = StoryObj<typeof ProfilePhoto>;

export const Idle: Story = {};
export const NoPhoto: Story = {
  args: { person: { initials: 'EG', cover: 'mint', src: null, name: 'Elufisan Ganiyu' } },
};
export const Uploading: Story = { args: { upload: { ...upload, uploading: true } } };
export const UploadError: Story = {
  args: {
    upload: { ...upload, error: 'Choose an image under 5 MB.', errorFrom: 'upload' },
  },
};
export const Removing: Story = { args: { upload: { ...upload, removing: true } } };
export const RemoveFailed: Story = {
  args: {
    upload: { ...upload, error: 'Your photo wasn’t removed. Try again.', errorFrom: 'remove' },
  },
};
/** Without onRemove the badge only picks (onboarding). */
export const PickOnly: Story = { args: { onRemove: undefined } };
export const Size72: Story = { args: { size: 72 } };
export const Size88: Story = { args: { size: 88 } };
export const Size112Ringed: Story = { args: { size: 112, ring: 'white', objectY: 0.25 } };
export const Phone: Story = {
  args: { ring: 'white' },
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};
