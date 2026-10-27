import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SearchField } from '@/components/molecules/SearchField/SearchField';
import { ADMIN_PAGES } from '@/lib/copy/admin';
import { PageHeader } from './PageHeader';

const meta: Meta<typeof PageHeader> = { title: 'Molecules/PageHeader', component: PageHeader };
export default meta;
type Story = StoryObj<typeof PageHeader>;

export const TitleAndSubtitle: Story = {
  args: {
    ...ADMIN_PAGES.credits,
  },
};

export const WithSearch: Story = {
  args: {
    ...ADMIN_PAGES.mentors,
    actions: (
      <SearchField
        label="Search mentors"
        placeholder="Name or email"
        value=""
        onChange={fn()}
        onClear={fn()}
      />
    ),
  },
};

export const LongTitleWraps: Story = {
  args: {
    title: 'A much longer page title that has to wrap on a phone without breaking the layout',
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

export const WithCountAndAction: Story = {
  args: {
    title: 'Sessions',
    titleAside: <span>· 2 of 5</span>,
    subtitle: 'The sessions mentees can book with you.',
    measure: 'wide',
    actions: <button type="button">Create session</button>,
  },
};
