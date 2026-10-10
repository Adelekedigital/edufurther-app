import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Notice } from '@/components/molecules/Notice/Notice';
import { sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { BookingAnswer } from '@/types/booking';
import { SessionPrepAside, SessionPrepButtons, type GuideTip } from '../SessionPrep/SessionPrep';
import { SessionLobby, type LobbyPerson } from './SessionLobby';

const me = sampleParty({
  id: 'me',
  name: 'Gbenga Ogundipe',
  firstName: 'Gbenga',
  initials: 'GO',
  cover: 'sky',
});
const amara = sampleParty();
const you = (presence: string, tone: LobbyPerson['tone'] = 'away'): LobbyPerson => ({
  person: me,
  name: 'You',
  presence,
  tone,
});
const her = (presence: string, tone: LobbyPerson['tone'] = 'away'): LobbyPerson => ({
  person: amara,
  name: 'Amara',
  presence,
  tone,
});
const calendar = {
  id: 's1',
  title: '1:1 call with Amara Okafor',
  startsAt: '2026-10-04T17:00:00Z',
  endsAt: '2026-10-04T17:30:00Z',
  pageUrl: 'https://app.test/sessions/s1',
  venue: 'EduFurther video',
};
const cancel = [
  { key: 'cancel', icon: 'event_busy' as const, label: 'Cancel', onClick: fn(), danger: true },
];
const ANSWERS: BookingAnswer[] = [
  {
    questionId: 'q1',
    question: 'What would you like to talk about?',
    kind: 'free_text',
    retired: false,
    answered: true,
    required: null,
    text: 'I’m applying to PhD programs in public health for Fall 2027.',
    file: null,
  },
];
const GUIDE: GuideTip[] = [
  {
    icon: 'checklist',
    title: 'Come with one clear goal',
    body: 'Read Amara’s answers and have one next step ready for them.',
  },
  {
    icon: 'wifi',
    title: 'Check your setup',
    body: 'A quiet spot, headphones and a steady connection make the call easier for both of you.',
  },
  {
    icon: 'event_repeat',
    title: 'If plans change',
    body: 'Cancel at least 12 hours before, so the time can go to someone else.',
  },
];

/** Session Join.dc.html `layout=lobby`, each phase. Props only: the page builds them. */
const meta: Meta<typeof SessionLobby> = {
  title: 'Organisms/Session lobby',
  component: SessionLobby,
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: 680,
          border: '1px solid var(--ink-200)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    title: '1:1 call with Amara Okafor',
    meta: 'Sun, Oct 4 · 6:00 – 6:30 pm · Lagos (WAT) · EduFurther video',
  },
};
export default meta;
type Story = StoryObj<typeof SessionLobby>;

export const Upcoming: Story = {
  args: {
    ground: 'white',
    status: { tone: 'blue', label: 'Upcoming' },
    clock: { label: 'Starts in', value: '1:45:00', sub: 'Join opens in 1:40:00' },
    people: [you('Not in the call'), her('Not here yet')],
    join: {
      label: 'Join opens in 1:40:00',
      enabled: false,
      onJoin: fn(),
      hint: 'The button turns on 5 minutes before the start.',
    },
    links: cancel,
    calendar,
  },
};

export const StartingSoon: Story = {
  args: {
    ground: 'blue',
    status: { tone: 'blue', label: 'Starting soon' },
    clock: { label: 'Starts in', value: '03:12', sub: 'Join is open' },
    people: [you('Ready when you are'), her('Joined', 'joined')],
    join: {
      label: 'Join session',
      enabled: true,
      onJoin: fn(),
      hint: 'Opens in your browser. No download needed.',
    },
    links: cancel,
    calendar,
  },
};

export const InProgress: Story = {
  args: {
    ground: 'green',
    status: { tone: 'green', label: 'In progress', live: true },
    // No timer once started: the call may run on another platform.
    clock: null,
    people: [you('Ready when you are'), her('Joined', 'joined')],
    join: {
      label: 'Join now',
      enabled: true,
      onJoin: fn(),
      hint: 'Amara has joined. Opens in your browser. No download needed.',
    },
  },
};

/** The popup was blocked: the link, under the button. */
export const PopupBlocked: Story = {
  args: {
    ...InProgress.args,
    notice: (
      <Notice tone="info">
        Your browser blocked the meeting window. <a href="#">Open the session</a>. Your arrival is
        recorded.
      </Notice>
    ),
  },
};

/** Past the join window, for someone who has been in: back in through the door (#380). */
export const Rejoin: Story = {
  args: {
    ground: 'green',
    status: { tone: 'green', label: 'In progress', live: true },
    clock: null,
    people: [you('Joined', 'joined'), her('Joined', 'joined')],
    join: {
      label: 'Rejoin session',
      enabled: true,
      onJoin: fn(),
      hint: 'Amara has joined. Opens in your browser. No download needed.',
    },
  },
};

/** Ours, provisional: past the join window for someone who never joined (product, 2026-10-08). */
export const WindowClosed: Story = {
  args: {
    ground: 'green',
    status: { tone: 'green', label: 'In progress', live: true },
    clock: null,
    people: [you('Not in the call'), her('Joined', 'joined')],
    note: 'Joining closed at 6:15 pm, 15 minutes after the start.',
  },
};

/** Ours, provisional: over, attendance not settled yet. */
export const Settling: Story = {
  args: {
    ground: 'white',
    status: { tone: 'neutral', label: 'Ended' },
    clock: null,
    people: [you('Joined at 6:01 pm', 'joined'), her('No arrival recorded')],
    note: 'This session has ended. We’re confirming who joined, which can take up to an hour.',
  },
};

export const LongNames: Story = {
  args: {
    ...Upcoming.args,
    title: 'Statement of Purpose deep review with Oluwadamilareoluwa Adebayo-Ogunlesi',
    people: [you('Not in the call'), { ...her('Not here yet'), name: 'Oluwadamilareoluwa' }],
  },
};

const SUB = 'From Amara’s booking answers.';

/** `lobbySplit`: the lobby with the answers and the guide beside it, as the page composes them. */
export const WithPrep: Story = {
  args: Upcoming.args,
  render: (args) => (
    <div
      style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-start' }}
    >
      <div style={{ flex: '1.4 1 400px', minWidth: 0 }}>
        <SessionLobby {...args} />
      </div>
      <SessionPrepAside
        answersTitle="What Amara wants to talk about"
        answersSub={SUB}
        answers={ANSWERS}
        guide={GUIDE}
      />
    </div>
  ),
};

/** Nothing was answered: only the guide card. */
export const PrepWithoutAnswers: Story = {
  render: () => (
    <SessionPrepAside
      answersTitle="What Amara wants to talk about"
      answersSub={SUB}
      answers={[]}
      guide={GUIDE}
    />
  ),
};

/** The answers failed to load: the card stays, with a retry. */
export const PrepAnswersFailed: Story = {
  render: () => (
    <SessionPrepAside
      answersTitle="What Amara wants to talk about"
      answersSub={SUB}
      answers={null}
      answersFailed
      onRetryAnswers={fn()}
      guide={GUIDE}
    />
  ),
};

/** Phones: the two buttons at the foot of the lobby card, each opening a sheet. */
export const PrepOnPhones: Story = {
  args: Upcoming.args,
  globals: { viewport: { value: 'mobile1' } },
  render: (args) => (
    <>
      <SessionLobby {...args} />
      <SessionPrepButtons answersLabel="Amara’s answers" showAnswers onOpen={fn()} />
    </>
  ),
};

/** Over and ruled on: who joined, in the design's completed rings. */
export const Completed: Story = {
  args: {
    ground: 'green',
    status: { tone: 'neutral', label: 'Completed' },
    clock: null,
    people: [you('Joined', 'joined'), her('Joined', 'joined')],
  },
};

/** Missed by the other person: their ring is red. */
export const Missed: Story = {
  args: {
    ground: 'green',
    status: { tone: 'red', label: 'Missed' },
    clock: null,
    people: [you('Joined', 'joined'), her('Didn’t join', 'absent')],
  },
};

/** EduFurther video: Amara pressed Join but Daily hasn't seen her in the room yet. */
export const JoiningOnDaily: Story = {
  args: {
    ...InProgress.args,
    people: [you('Ready when you are'), her('Joining…')],
    join: {
      label: 'Join now',
      enabled: true,
      onJoin: fn(),
      hint: 'Opens in your browser. No download needed.',
    },
  },
};
