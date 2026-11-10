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

/** look="track": Admin Analytics.dc.html (lg window, md toggle) and PerformanceChart.dc.html (sm). */
export const Track: Story = {
  render: function Render() {
    const [win, setWin] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
    const [by, setBy] = useState<'country' | 'school'>('country');
    const [type, setType] = useState<'bar' | 'line'>('bar');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
        <SegmentedControl
          look="track"
          size="lg"
          layout="hug"
          label="Time window"
          value={win}
          onChange={setWin}
          options={[
            { value: '7d', label: '7 days' },
            { value: '30d', label: '30 days' },
            { value: '90d', label: '90 days' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        <SegmentedControl
          look="track"
          layout="hug"
          label="Group by"
          value={by}
          onChange={setBy}
          options={[
            { value: 'country', label: 'Country' },
            { value: 'school', label: 'School' },
          ]}
        />
        <SegmentedControl
          look="track"
          size="sm"
          label="Chart type"
          value={type}
          onChange={setType}
          options={[
            { value: 'bar', label: 'Bar chart', icon: 'bar_chart', iconOnly: true },
            { value: 'line', label: 'Line chart', icon: 'show_chart', iconOnly: true },
          ]}
        />
      </div>
    );
  },
};

/** Session Types.dc.html "When can mentees book this?". */
