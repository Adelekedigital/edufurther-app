import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { fn } from 'storybook/test';
import { PhotoPicker } from './PhotoPicker';

/** ProfilePhoto.dc.html: the owner's camera badge on the 112px photo. */
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
  args: { error: 'You’re offline, so the photo didn’t upload.', errorFrom: 'upload' },
};
export const WithMenu: Story = { args: { onRemove: fn(), onRetryRemove: fn() } };
export const Removing: Story = { args: { onRemove: fn(), removing: true } };
export const RemoveFailed: Story = {
  args: {
    onRemove: fn(),
    onRetryRemove: fn(),
    error: 'Your photo wasn’t removed. Try again.',
    errorFrom: 'remove',
  },
};
/** A removal lands after mount, as on the page, so "Photo removed." shows. */
const JustRemoved = (args: ComponentProps<typeof PhotoPicker>) => {
  const [stamp, setStamp] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStamp(1), 0);
    return () => clearTimeout(t);
  }, []);
  return <PhotoPicker {...args} removedStamp={stamp} />;
};
export const Removed: Story = {
  args: { hasPhoto: false, onRemove: fn() },
  render: (args) => (
    <Photo empty>
      <JustRemoved {...args} />
    </Photo>
  ),
};
export const Phone: Story = { globals: { viewport: { value: 'mobile2', isRotated: false } } };
