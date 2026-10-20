import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/components/atoms/Button/Button';
import { coverVars } from '@/lib/utils/cover';
import { CoverBanner } from './CoverBanner';

// An inline image, so the stories render without the network.
const BANNER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="180"><rect width="1440" height="180" fill="slategray"/><circle cx="1200" cy="90" r="60" fill="wheat"/></svg>',
  );

const meta: Meta<typeof CoverBanner> = {
  title: 'Molecules/CoverBanner',
  component: CoverBanner,
  args: {
    tones: coverVars('sky'),
    height: 140,
    art: 'icons',
    icons: ['school', 'payments', 'edit_document'],
    scale: 'lg',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 1120 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof CoverBanner>;

/** The profile header's cover: three topic icons. */
export const Icons: Story = {};
export const Pattern: Story = { args: { art: 'pattern', tones: coverVars('mint') } };
export const Single: Story = { args: { art: 'single', tones: coverVars('peach') } };
export const NoArt: Story = { args: { art: 'none', tones: coverVars('lilac') } };
/** A banner image: the art is never drawn over it. */
export const Image: Story = { args: { bannerUrl: BANNER } };
/** The owner's tools, top right, outside the clip. */
export const WithTools: Story = {
  args: {
    tools: (
      <Button variant="secondary-outlined" size="small">
        Change cover
      </Button>
    ),
  },
};
/** Settings' photo card: 120px, the medium art. */
export const SettingsCard: Story = { args: { height: 120, scale: 'md' } };
/** The preview card: 64px, the small art. */
export const PreviewCard: Story = {
  args: { height: 64, scale: 'sm' },
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
};
