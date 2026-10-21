import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FactTile } from './FactTile';

const meta: Meta<typeof FactTile> = { title: 'Molecules/FactTile', component: FactTile };
export default meta;
type Story = StoryObj;

export const FactTiles: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        maxWidth: 600,
      }}
    >
      <FactTile icon="home_pin" tone="green" label="From" value="Nigeria" />
      <FactTile icon="school" tone="blue" label="Studied in" value="United States" />
      <FactTile icon="translate" tone="gold" label="Mentors in" value="English, Yoruba" />
    </div>
  ),
};
