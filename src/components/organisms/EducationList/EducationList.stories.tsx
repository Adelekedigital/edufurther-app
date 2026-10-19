import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { EducationRow } from '@/lib/utils/educationLine';
import { EducationList } from './EducationList';

/** Mentee Settings.dc.html `isMEdu` (menteeTabs=split): Settings › Education. */
const meta: Meta<typeof EducationList> = {
  title: 'Organisms/Education list',
  component: EducationList,
  args: {
    status: 'ready',
    rows: [],
    onAdd: fn(),
    onEdit: fn(),
    onDelete: fn(),
    onRetry: fn(),
  },
  // The settings screen's type and ink, which the card inherits.
  decorators: [
    (Story) => (
      <div style={{ fontFamily: 'var(--font-ui)', color: 'var(--ink-900)' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof EducationList>;

const lagos: EducationRow = {
  id: 'e1',
  degree: 'BSc',
  course: 'Microbiology',
  school: 'University of Lagos',
  start: '2018',
  end: '2022',
};
const ucl: EducationRow = {
  id: 'e2',
  degree: 'MSc',
  course: 'Public Health',
  school: 'University College London',
  start: '2023',
  end: '2024',
};

export const Filled: Story = { args: { rows: [ucl, lagos] } };

export const One: Story = { args: { rows: [lagos] } };

export const Empty: Story = {};

export const LongNames: Story = {
  args: {
    rows: [
      {
        id: 'e3',
        degree: 'Bachelor’s',
        course: 'Agricultural Economics and Extension Services with Rural Sociology',
        school: 'Federal University of Agriculture, Abeokuta, Ogun State, Nigeria',
        start: '2016',
        end: '2021',
      },
      lagos,
    ],
  },
};

export const Loading: Story = { args: { status: 'loading' } };

export const LoadFailed: Story = { args: { status: 'error' } };
