import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tag } from '@/components/atoms/Tag/Tag';
import { PhotoFrame } from './PhotoFrame';

const PHOTO = 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600';

/**
 * The two callers' boxes, as their own CSS draws them: MentorCard 445 / 300 with
 * the large radius, the featured card's 400 x 313. A grid cell, so the frame fills it.
 */
const card = {
  display: 'grid',
  width: 445,
  aspectRatio: '445 / 300',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
};
const feature = { display: 'grid', width: 400, height: 313 };

const meta: Meta<typeof PhotoFrame> = {
  title: 'Molecules/PhotoFrame',
  component: PhotoFrame,
  args: { alt: 'Aderewa Oluchi', initials: 'AO', cover: 'rose', src: PHOTO },
  decorators: [
    (Story, { parameters }) => (
      <div style={parameters.box ?? card}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof PhotoFrame>;

export const Photo: Story = {};
export const NoPhoto: Story = { args: { src: null } };
/** The image fails to load: the initials take its place. */
export const BrokenImage: Story = { args: { src: '/does-not-exist.jpg' } };
export const FaceLow: Story = { args: { focus: { x: 0.5, y: 0.9 } } };

/** MentorCard's photo: the scrim and a label over it, initials at `md`. */
export const CardShape: Story = {
  args: {
    scrim: true,
    lazy: true,
    children: (
      <span style={{ position: 'absolute', top: 12, left: 12 }}>
        <Tag tone="on-photo">Top-rated</Tag>
      </span>
    ),
  },
};
export const CardShapeNoPhoto: Story = { args: { ...CardShape.args, src: null } };

/** The featured mentor's photo: 400px wide, initials at `lg`. */
export const FeatureShape: Story = { parameters: { box: feature }, args: { size: 'lg' } };
export const FeatureShapeNoPhoto: Story = {
  parameters: { box: feature },
  args: { size: 'lg', src: null },
};
