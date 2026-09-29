import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { Remote } from '@/types/mentor';
import type { OwnSessionType } from '@/types/sessionType';
import { SessionTypeManager } from './SessionTypeManager';

/** Session Types list (Session Types.dc.html, List / Empty) in all four states. */
const meta: Meta = { title: 'Organisms/Session types' };
export default meta;
type Story = StoryObj;

const T = (over: Partial<OwnSessionType>): OwnSessionType => ({
  id: 'x',
  name: 'SOP draft review',
  description:
    'We’ll work through your statement of purpose together, focusing on how your story fits the program and the strength of your opening. You’ll leave with a prioritized revision list and clarity on your next draft.',
  durationMin: 60,
  noticeMin: 1440,
  isLive: true,
  topics: [{ code: 'document-preparation', label: 'Document preparation' }],
  icon: 'edit_document',
  iconChoice: null,
  questionCount: 2,
  ...over,
});
const TYPES: OwnSessionType[] = [
  T({ id: 'a' }),
  T({
    id: 'b',
    name: 'Program shortlist',
    description:
      'Narrow your list to programs that fit your research and fund international students.',
    durationMin: 30,
    topics: [{ code: 'program-selection', label: 'Program selection' }],
    icon: 'school',
    questionCount: 1,
  }),
  T({
    id: 'c',
    name: 'Visa interview prep',
    description: 'A mock visa interview with honest notes on what to tighten before the real one.',
    durationMin: 45,
    isLive: false,
    topics: [{ code: 'interview-preparation', label: 'Interview preparation' }],
    icon: 'record_voice_over',
    questionCount: 1,
  }),
];
const TEMPLATES = [
  {
    key: 'sop',
    href: '#',
    icon: 'edit_document' as const,
    name: 'SOP draft review',
    hint: '60 min · 2 questions',
  },
  {
    key: 'visa',
    href: '#',
    icon: 'record_voice_over' as const,
    name: 'Mock visa interview',
    hint: '45 min · 1 question',
  },
  {
    key: 'list',
    href: '#',
    icon: 'school' as const,
    name: 'Program shortlist',
    hint: '30 min · 1 question',
  },
];
const remote = (over: Partial<Remote<OwnSessionType[]>>): Remote<OwnSessionType[]> => ({
  data: null,
  isLoading: false,
  error: null,
  retry: fn(),
  ...over,
});
const base = {
  messages: {},
  onLiveChange: fn(),
  onDelete: fn(),
  createHref: '#',
  templates: TEMPLATES,
};

export const Content: Story = {
  render: () => <SessionTypeManager {...base} list={remote({ data: TYPES })} />,
};
export const Loading: Story = {
  render: () => <SessionTypeManager {...base} list={remote({ isLoading: true })} />,
};
export const Empty: Story = {
  render: () => <SessionTypeManager {...base} list={remote({ data: [] })} />,
};
export const Error: Story = {
  render: () => (
    <SessionTypeManager
      {...base}
      list={remote({ error: { kind: 'server', message: 'Something went wrong on our side.' } })}
    />
  ),
};
export const ErrorOffline: Story = {
  render: () => (
    <SessionTypeManager
      {...base}
      list={remote({ error: { kind: 'offline', message: 'You’re offline.' } })}
    />
  ),
};
/** Long name and no description; a switch that didn't save; a count that couldn't load; no topic. */
export const EdgeCases: Story = {
  render: () => (
    <SessionTypeManager
      {...base}
      messages={{ long: 'Couldn’t hide it. Check your connection and try again.' }}
      list={remote({
        data: [
          T({
            id: 'long',
            name: 'Statement of purpose and personal history essay review for US and Canadian graduate programs',
            description: '',
            questionCount: null,
            topics: [],
            icon: 'video_call',
          }),
          ...TYPES.slice(1),
        ],
      })}
    />
  ),
};
