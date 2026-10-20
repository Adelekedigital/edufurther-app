import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { PrefixedInput } from '@/components/molecules/PrefixedInput/PrefixedInput';
import type { SocialRow } from '@/types/mentorSettings';
import { SocialLinksCard } from './SocialLinksCard';

/** Mentor Settings.dc.html, the Social links tab (`isSocial`, linksScope=limited). */
const meta: Meta<typeof SocialLinksCard> = {
  title: 'Settings/Social links',
  component: SocialLinksCard,
  parameters: { layout: 'padded' },
  args: {
    status: 'ready',
    onRetry: fn(),
    onSave: async () => true,
    saving: false,
    saveError: null,
    onRemove: fn(),
  },
  decorators: [(Story) => <div style={{ maxWidth: 640 }}>{Story()}</div>],
};
export default meta;
type Story = StoryObj<typeof SocialLinksCard>;

const row = (id: string, kind: SocialRow['kind'], url: string, value: string): SocialRow => ({
  id,
  kind,
  url,
  value,
  mark: kind,
});
const DESIGN = [
  row('linkedin', 'linkedin', 'https://www.linkedin.com/in/gbengaelufisan', 'gbengaelufisan'),
  row('l1', 'youtube', 'https://www.youtube.com/@gradpathwithteam', 'gradpathwithteam'),
];

/** The design's two links. */
export const Links: Story = { args: { rows: DESIGN } };

/** Every mark, three websites (one on Substack), a long address. */
export const Every: Story = {
  args: {
    rows: [
      ...DESIGN,
      row('l2', 'x', 'https://x.com/gbenga', 'gbenga'),
      row('l3', 'instagram', 'https://www.instagram.com/gbenga.e', 'gbenga.e'),
      row('l4', 'facebook', 'https://www.facebook.com/gbenga.elufisan', 'gbenga.elufisan'),
      row('l5', 'tiktok', 'https://www.tiktok.com/@gbenga', 'gbenga'),
      {
        ...row('l6', 'website', 'https://gbenga.substack.com', 'gbenga.substack.com'),
        mark: 'substack',
      },
      row('l7', 'website', 'https://gbenga.dev', 'gbenga.dev'),
      row(
        'l8',
        'website',
        'https://www.a-very-long-portfolio-domain-name.example.com/writing/applications/2026',
        'a-very-long-portfolio-domain-name.example.com/writing/applications/2026',
      ),
    ],
  },
};

export const Empty: Story = { args: { rows: [] } };
export const Loading: Story = { args: { status: 'loading', rows: [] } };
export const LoadFailed: Story = { args: { status: 'error', rows: [] } };
/** A refused save (open the form with Add link to see it). */
export const SaveRefused: Story = {
  args: { rows: DESIGN, saveError: 'You’ve already added X. Edit that one instead.' },
};

/** The field on its own: a handle, and one with a problem. */
export const Field: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
      <PrefixedInput aria-label="X handle" prefix="x.com/" placeholder="handle" defaultValue="" />
      <PrefixedInput aria-label="Website address" prefix="https://" defaultValue="yoursite.com" />
      <PrefixedInput aria-label="Bad handle" prefix="tiktok.com/@" defaultValue="ada l" invalid />
    </div>
  ),
};
