import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LegalLine } from './LegalLine';

const meta: Meta<typeof LegalLine> = {
  title: 'Molecules/LegalLine',
  component: LegalLine,
  decorators: [(S) => <div style={{ maxWidth: 376 }}>{S()}</div>],
};
export default meta;

export const Default: StoryObj<typeof LegalLine> = {};
