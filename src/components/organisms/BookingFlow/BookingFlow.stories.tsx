import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { BookingDay, Mentor, SessionType } from '@/types/mentor';
import { BookingFlow } from './BookingFlow';

const mentor: Mentor = {
  id: 'm1',
  profileHref: '/mentors/olajuwon',
  name: 'Olajuwon Samuel',
  firstName: 'Olajuwon',
  initials: 'OS',
  photoUrl: null,
  tone: 1,
  degreeLine: 'MSc, Computer Science',
  institution: 'University of London',
  completedSessions: 23,
  reviewCount: 11,
  rating: 4.9,
  label: 'top-rated',
  nextAvailableAt: null,
  topics: [],
};
const sessionTypes: SessionType[] = [
  {
    id: 'st1',
    name: 'General mentorship',
    durationMin: 60,
    description: 'An open conversation about your study-abroad plans.',
    questions: [
      { id: 'q1', label: 'What would you like to cover?', kind: 'text', required: false },
    ],
  },
  {
    id: 'st2',
    name: 'CV review',
    durationMin: 60,
    description: 'Line by line.',
    questions: [{ id: 'q2', label: 'Upload your current CV', kind: 'file', required: true }],
  },
];
const days: BookingDay[] = [0, 1, 2, 3, 4].map((i) => ({
  date: `2026-09-${28 + i}`,
  slots: [9, 13].map((h) => ({ startsAt: `2026-09-${28 + i}T${h}:00:00Z` })),
}));

/** Rendered without the ModalShell: the page supplies the frame via renderShell. */
const meta: Meta<typeof BookingFlow> = {
  title: 'Organisms/BookingFlow',
  component: BookingFlow,
  args: {
    mentor,
    options: { sessionTypes, days },
    optionsLoading: false,
    optionsError: null,
    onRetryOptions: fn(),
    isGuest: false,
    onSignup: fn(),
    onRequest: fn(),
    requestPending: false,
    requestDone: false,
    requestError: null,
    onClose: fn(),
    deviceZone: 'Africa/Lagos',
    renderShell: (shell, body) => (
      <div
        style={{
          maxWidth: 880,
          padding: 24,
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: 18 }}>{shell.title}</h2>
        <p style={{ color: 'var(--text-tertiary)', marginBottom: 20 }}>{shell.subtitle}</p>
        {body}
      </div>
    ),
  },
};
export default meta;
type Story = StoryObj<typeof BookingFlow>;

export const PickTime: Story = {};
export const Guest: Story = { args: { isGuest: true } };
export const SingleSessionType: Story = {
  args: { options: { sessionTypes: [sessionTypes[0]!], days } },
};
export const LoadingOptions: Story = { args: { options: null, optionsLoading: true } };
export const OptionsError: Story = {
  args: { options: null, optionsError: { kind: 'server', message: 'x' } },
};
export const Sending: Story = { args: { requestPending: true } };
export const Sent: Story = { args: { requestDone: true } };
