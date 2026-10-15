import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { FloatingHelp } from './FloatingHelp';

const meta = {
  title: 'Organisms/FloatingHelp',
  component: FloatingHelp,
  parameters: { layout: 'fullscreen' },
  args: {
    show: true,
    title: 'Not sure which mentor to choose?',
    label: 'Talk to us',
    sheetLabel: 'Book a free call',
    body: 'Book a free 15-min call with our team and we’ll suggest mentors who fit. No credit used.',
    external: true,
    onAction: fn(),
  },
} satisfies Meta<typeof FloatingHelp>;
export default meta;

type Story = StoryObj<typeof meta>;

/** The resting pill (bottom-centre). Dismiss collapses it to a corner icon. */
export const Pill: Story = {};

/** Hidden — e.g. the booking URL isn't configured, so there's no dead control. */
export const Hidden: Story = { args: { show: false } };
