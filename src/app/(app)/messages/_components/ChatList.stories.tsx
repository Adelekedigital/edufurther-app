import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { ChatPerson, ChatRow } from '@/types/messages';
import { ChatList, ChatListSkeleton } from './ChatList';
import { rowView } from './chatRows';

const NOW = new Date('2026-10-27T12:00:00Z');
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();
const who = (id: string, name: string, institution: string): ChatPerson => ({
  id,
  name,
  firstName: name.split(' ')[0]!,
  initials: name
    .split(' ')
    .map((w) => w[0])
    .join(''),
  avatarUrl: null,
  avatarFocus: null,
  cover: 'sky',
  role: 'mentor',
  institution,
  handle: id,
  state: 'active',
});
const ROWS: ChatRow[] = [
  {
    person: who('uu', 'Ujunwa Umeokeke', 'Central European University'),
    last: {
      kind: 'text',
      text: 'Read your draft. Strong opening.',
      fileName: null,
      mine: false,
      at: ago(40),
      deleted: false,
    },
    unread: 2,
    nextBooking: {
      id: 'b1',
      startsAt: new Date(NOW.getTime() + 29 * 3_600_000).toISOString(),
      sessionName: null,
    },
  },
  {
    person: who('hm', 'Hugh Momah', 'University of Portsmouth'),
    last: {
      kind: 'file',
      text: null,
      fileName: 'CV.pdf',
      mine: true,
      at: ago(60 * 26),
      deleted: false,
    },
    unread: 0,
    nextBooking: null,
  },
  {
    person: who('ge', 'Gbenga Elufisan', 'University of Toronto'),
    last: null,
    unread: 0,
    nextBooking: {
      id: 'b2',
      startsAt: new Date(NOW.getTime() + 72 * 3_600_000).toISOString(),
      sessionName: null,
    },
  },
];
const views = ROWS.map((r) => rowView(r, 'Africa/Lagos', NOW));

/** The list column of `/messages` (Messages.dc.html `showList`), in each state it draws. */
const meta: Meta<typeof ChatList> = {
  title: 'Screens/Messages list',
  component: ChatList,
  args: {
    rows: views,
    currentId: 'uu',
    q: '',
    onQ: fn(),
    filter: 'all',
    onFilter: fn(),
    totalUnread: 2,
    noRows: null,
    onSelect: fn(),
    onSettings: fn(),
    onNew: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', height: 640 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ChatList>;

export const Default: Story = {};
export const NothingUnread: Story = {
  args: { rows: [], filter: 'unread', totalUnread: 0, noRows: 'unread' },
};
export const NoSearchMatch: Story = { args: { rows: [], q: 'zzz', noRows: 'search' } };
export const Loading: Story = { render: () => <ChatListSkeleton /> };
