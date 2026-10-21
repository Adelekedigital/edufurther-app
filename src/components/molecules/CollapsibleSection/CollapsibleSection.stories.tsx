import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CollapsibleSection, type CollapsibleChipTone } from './CollapsibleSection';

/** CollapsibleSection.dc.html: closed in each chip tone Calendar uses, and open. */
const meta: Meta = { title: 'Molecules/CollapsibleSection', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const body = <p style={{ margin: 0 }}>The section’s content.</p>;
const TONES: [CollapsibleChipTone, string][] = [
  ['neutral', '12 hrs a week'],
  ['warning', 'Unsaved'],
  ['danger', 'Fix hours'],
];

export const Closed: Story = {
  render: () => (
    <div style={{ maxWidth: 420, display: 'grid', gap: 16 }}>
      {TONES.map(([tone, chip]) => (
        <CollapsibleSection
          key={tone}
          title="Weekly availability"
          summary="Mon–Fri · 9 am–5 pm. Tap to view"
          chip={chip}
          chipTone={tone}
        >
          {body}
        </CollapsibleSection>
      ))}
    </div>
  ),
};

export const Open: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <CollapsibleSection
        title="Weekly availability"
        summary="Mon–Fri · 9 am–5 pm. Tap to view"
        chip="Not set"
        chipTone="warning"
        defaultOpen
      >
        {body}
      </CollapsibleSection>
    </div>
  ),
};

/** A long summary wraps at phone width; the chevron keeps its place. */
export const LongSummaryAt390: Story = {
  render: () => (
    <div style={{ width: 358 }}>
      <CollapsibleSection
        title="Weekly availability"
        summary="Sun, Mon, Wed, Thu, Fri, Sat · times vary by day. Tap to view"
        chip="27.5 hrs a week"
      >
        {body}
      </CollapsibleSection>
    </div>
  ),
};
