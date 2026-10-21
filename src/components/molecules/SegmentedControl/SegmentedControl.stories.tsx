import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SegmentedControl } from './SegmentedControl';
import { useState } from 'react';

const meta: Meta<typeof SegmentedControl> = {
  title: 'Molecules/SegmentedControl',
  component: SegmentedControl,
};
export default meta;
type Story = StoryObj;

export const Segmented: Story = {
  render: function Render() {
    const [price, setPrice] = useState<'free' | 'paid'>('free');
    const [kind, setKind] = useState<'text' | 'file'>('text');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SegmentedControl
          label="Price"
          width={200}
          value={price}
          onChange={setPrice}
          options={[
            { value: 'free', label: 'Free' },
            { value: 'paid', label: 'Paid' },
          ]}
        />
        <SegmentedControl
          label="Answer type"
          layout="hug"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'text', label: 'Short answer', icon: 'short_text' },
            { value: 'file', label: 'File upload', icon: 'upload_file' },
          ]}
        />
      </div>
    );
  },
};

/** Session Types.dc.html "When can mentees book this?". */
