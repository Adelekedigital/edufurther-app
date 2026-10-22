import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FormGrid } from './FormGrid';

const cell = { padding: 12, border: '1px dashed currentColor' };

/** Columns of at least 200px; narrow the canvas to see them wrap. */
const meta: Meta<typeof FormGrid> = {
  title: 'Atoms/FormGrid',
  component: FormGrid,
  args: {
    style: { maxWidth: 640 },
    children: ['First name', 'Last name', 'Country'].map((t) => (
      <div key={t} style={cell}>
        {t}
      </div>
    )),
  },
};
export default meta;
type Story = StoryObj<typeof FormGrid>;

export const Default: Story = {};
export const Tighter: Story = { args: { gap: 3 } };
export const Narrow: Story = { args: { style: { maxWidth: 360 } } };
