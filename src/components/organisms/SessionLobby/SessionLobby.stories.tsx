import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Notice } from '@/components/molecules/Notice/Notice';
import { sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { BookingAnswer } from '@/types/booking';
import { SessionPrep, type GuideTip } from '../SessionPrep/SessionPrep';
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
    text: 'I’m applying to PhD programs in public health for Fall 2027.',
    file: null,
  },
];
const GUIDE: GuideTip[] = [
  {
    title: 'Come with one clear goal',
    body: 'Read Amara’s answers above and have one next step ready for them.',
  },
  {
    title: 'Check your setup',
    body: 'A quiet spot, headphones and a steady connection make the call easier for both of you.',
  },
  {
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
    people: [you('Ready when you are'), her('Here now', 'here')],
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
    people: [you('Ready when you are'), her('Here now', 'here')],
    join: {
      label: 'Join now',
      enabled: true,
      onJoin: fn(),
      hint: 'Amara is in the call. Opens in your browser. No download needed.',
    },
  },
};

/** The popup was blocked: the link, under the button. */
export const PopupBlocked: Story = {
  args: {
    ...InProgress.args,
    notice: (
      <Notice tone="info">
        Your browser blocked the meeting window. <a href="#">Open the session</a>. You’re already
        marked as here.
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
    people: [you('Here now', 'here'), her('Here now', 'here')],
    join: {
      label: 'Rejoin session',
      enabled: true,
      onJoin: fn(),
      hint: 'Amara is in the call. Opens in your browser. No download needed.',
    },
  },
};

/** Ours, provisional: past the join window for someone who never joined (product, 2026-10-08). */
export const WindowClosed: Story = {
  args: {
    ground: 'green',
    status: { tone: 'green', label: 'In progress', live: true },
    clock: null,
    people: [you('Not in the call'), her('Here now', 'here')],
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

/** The lobby with the two rows under it, as the page composes them. */
export const WithPrep: Story = {
  args: Upcoming.args,
  render: (args) => (
    <>
      <SessionLobby {...args} />
      <SessionPrep answersTitle="What Amara wants to talk about" answers={ANSWERS} guide={GUIDE} />
    </>
  ),
};

/** Nothing was answered: only the guide row. */
export const PrepWithoutAnswers: Story = {
  render: () => (
    <SessionPrep answersTitle="What Amara wants to talk about" answers={[]} guide={GUIDE} />
  ),
};

/** The answers failed to load: the row stays, with a retry. */
export const PrepAnswersFailed: Story = {
  render: () => (
    <SessionPrep
      answersTitle="What Amara wants to talk about"
      answers={null}
      answersFailed
      onRetryAnswers={fn()}
      guide={GUIDE}
    />
  ),
};
