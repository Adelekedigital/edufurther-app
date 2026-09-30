import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { fn } from 'storybook/test';
import { PhotoPicker } from './PhotoPicker';

/** Mentor Profile.dc.html: the owner's camera badge on the 112px photo. */
const Photo = ({ children, empty }: { children: ReactNode; empty?: boolean }) => (
  <div style={{ position: 'relative', width: 112, height: 112, margin: 24 }}>
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: empty ? 'var(--blue-700)' : 'var(--ink-300)',
        boxShadow: '0 0 0 4px var(--white)',
      }}
    />
    {children}
  </div>
);

const meta: Meta<typeof PhotoPicker> = {
  title: 'Molecules/Photo picker',
  component: PhotoPicker,
  args: {
    hasPhoto: true,
    accept: 'image/jpeg,image/png,image/webp',
    uploading: false,
    onFile: fn(),
    error: null,
    onDismissError: fn(),
  },
  render: (args) => (
    <Photo empty={!args.hasPhoto}>
      <PhotoPicker {...args} />
    </Photo>
  ),
};
export default meta;
type Story = StoryObj<typeof PhotoPicker>;

export const ChangePhoto: Story = {};
export const AddPhoto: Story = { args: { hasPhoto: false } };
export const Uploading: Story = { args: { uploading: true } };
export const WrongType: Story = { args: { error: 'Choose a JPEG, PNG or WebP image.' } };
export const TooBig: Story = { args: { error: 'Choose an image under 5 MB.' } };
export const Offline: Story = {
  args: { error: 'You’re offline. Try again when you’re connected.' },
};
export const Phone: Story = { globals: { viewport: { value: 'mobile2', isRotated: false } } };
