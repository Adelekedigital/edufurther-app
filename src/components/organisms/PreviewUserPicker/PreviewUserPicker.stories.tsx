import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { PreviewUser } from '@/lib/api/data/previewStore';
import { PreviewUserPicker } from './PreviewUserPicker';

const user = (i: number, over: Partial<PreviewUser> = {}): PreviewUser => ({
  id: `u-${i}`,
  email: `person${i}@example.com`,
  name: `Person ${i}`,
  firstName: 'Person',
  initials: 'P',
  role: i % 2 ? 'mentor' : 'mentee',
  ...over,
});

const users: PreviewUser[] = [
  user(0, {
    email: 'amara.okafor@example.com',
    name: 'Amara Okafor',
    firstName: 'Amara',
    initials: 'AO',
    role: 'mentee',
  }),
  user(1, {
    email: 'tunde.bello@example.com',
    name: 'Tunde Bello',
    firstName: 'Tunde',
    initials: 'TB',
    role: 'mentor',
  }),
  // No name on the account: the email's local part stands in.
  user(2, { email: 'kemi@example.com', name: 'kemi', firstName: 'kemi', initials: 'K' }),
  // The awkward one: a long email and name that must truncate, not wrap the row.
  user(3, {
    email: 'oluwaseun.adebayo-williams.graduate.admissions@university-of-example.ac.uk',
    name: 'Oluwaseun Adebayo-Williams Graduate',
    initials: 'OA',
  }),
];

const noMore = { hasMore: false, loadingMore: false, loadMoreFailed: false, loadMore: fn() };

/**
 * The Preview as user picker (AppShell.dc.html "View as user (admin)" panel):
 * search, the role filter and the accounts as a listbox. Drawn under the bar's
 * picker button, so each story gives it a positioned anchor.
 */
const meta: Meta<typeof PreviewUserPicker> = {
  title: 'Organisms/Preview user picker',
  component: PreviewUserPicker,
  decorators: [
    (Story) => (
      <div style={{ paddingBottom: 460 }}>
        <div style={{ position: 'relative', height: 32 }}>
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    id: 'preview-picker',
    query: '',
    onQuery: fn(),
    role: 'all',
    onRole: fn(),
    users,
    status: 'ready',
    onRetry: fn(),
    currentId: null,
    miss: null,
    startFailed: false,
    onPick: fn(),
    more: noMore,
    onClose: fn(),
  },
};
export default meta;
type Story = StoryObj<typeof PreviewUserPicker>;

export const Ready: Story = {};

/** The first page is on its way: skeleton rows, announced as busy. */
export const Loading: Story = { args: { status: 'loading', users: [] } };

/** The search failed: the message and Try again (`vaListError`). */
export const LoadFailed: Story = { args: { status: 'error', users: [] } };

/** Nothing matches what was typed. */
export const NoMatch: Story = { args: { query: 'zzz', users: [] } };

/** An unknown ?viewAs= value: the red note, and the list to pick from. */
export const Miss: Story = { args: { miss: 'ghost@example.com' } };

/** Mid-preview: the current person is selected, with a check. */
export const Selected: Story = { args: { currentId: 'u-1', role: 'mentor' } };

/** A pick the server couldn't open (provisional copy, no design). */
export const StartFailed: Story = { args: { startFailed: true } };

/** A full page and more coming: the list scrolls, the next page loads at its end. */
export const ManyRows: Story = {
  args: {
    users: Array.from({ length: 20 }, (_, i) => user(i)),
    more: { ...noMore, hasMore: true, loadingMore: true },
  },
};

/** The next page failed: the rows stay, with their own Try again. */
export const MoreFailed: Story = {
  args: {
    users: Array.from({ length: 20 }, (_, i) => user(i)),
    more: { ...noMore, hasMore: true, loadMoreFailed: true },
  },
};
