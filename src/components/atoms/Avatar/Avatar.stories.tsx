import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { CSSProperties } from 'react';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Atoms/Avatar',
  component: Avatar,
  args: { initials: 'EG', tone: 'sky', alt: 'Elufisan Ganiyu' },
};
export default meta;
type Story = StoryObj<typeof Avatar>;

const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, padding: 24 };
const SIZES = ['sm', 'nav', 'md', 'lg', 'xl', '2xl', 52, 72, 88, 112] as const;
/** A photo that loads in Storybook without the network. */
const PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="lightsteelblue"/><circle cx="50" cy="30" r="16" fill="slategray"/></svg>',
  );

export const EverySize: Story = {
  render: (args) => (
    <div style={row}>
      {SIZES.map((s) => (
        <Avatar key={s} {...args} size={s} />
      ))}
    </div>
  ),
};
export const Photos: Story = {
  render: (args) => (
    <div style={row}>
      {SIZES.map((s) => (
        <Avatar key={s} {...args} size={s} src={PHOTO} />
      ))}
    </div>
  ),
};
/** On a cover, as the profile header and the settings preview draw it: 3px, 4px at 112. */
export const WhiteRing: Story = {
  render: (args) => (
    <div style={{ ...row, background: 'var(--cover-sky-bg)' }}>
      <Avatar {...args} size={52} ring="white" />
      <Avatar {...args} size={72} ring="white" />
      <Avatar {...args} size={112} ring="white" />
    </div>
  ),
};
/** The photo didn't load: the initials show instead. */
export const BrokenImage: Story = { args: { size: 112, src: '/no-such-photo.webp' } };
/** The profile header's crop: a quarter down unless the face is known. */
export const DefaultCrop: Story = { args: { size: 112, src: PHOTO, objectY: 0.25 } };
/** Children sit on the circle, in an unclipped frame (PhotoPicker's badge). */
export const WithSlot: Story = {
  args: { size: 88 },
  render: (args) => (
    <div style={row}>
      <Avatar {...args}>
        <span
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--blue-500)',
          }}
        />
      </Avatar>
    </div>
  ),
};
export const Plain: Story = { args: { tone: 'plain', size: 'lg' } };
export const Blank: Story = {
  args: { tone: 'plain', initials: '', size: 'lg', alt: 'Deleted user' },
};
export const Phone: Story = {
  ...EverySize,
  globals: { viewport: { value: 'mobile2', isRotated: false } },
};
