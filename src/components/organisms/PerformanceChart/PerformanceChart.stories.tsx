import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PerformanceChart } from './PerformanceChart';
import type { ChartSeries } from './model';

const months = Array.from({ length: 18 }, (_, i) => {
  const d = new Date(Date.UTC(2024, 7 + i, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
});
const series: ChartSeries[] = [
  { key: 'completed', label: 'Completed', color: 'var(--blue-500)', values: [0, 1, 0, 2, 1, 2, 3, 2, 4, 3, 2, 5, 4, 6, 3, 5, 7, 6] },
  { key: 'canceled', label: 'Canceled', color: 'var(--blue-200)', values: [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0] },
  { key: 'missed', label: 'Missed', color: 'var(--orange-500)', values: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1] },
];

const meta: Meta<typeof PerformanceChart> = {
  title: 'Organisms/PerformanceChart',
  component: PerformanceChart,
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj<typeof PerformanceChart>;

export const Bars: Story = { args: { series, months } };
export const Line: Story = { args: { series, months, variant: 'line' } };
export const Empty: Story = {
  args: { series: series.map((s) => ({ ...s, values: s.values.map(() => 0) })), months },
};
