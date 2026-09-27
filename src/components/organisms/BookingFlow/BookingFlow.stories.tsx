import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { BookingDay, Mentor, SessionType } from '@/types/mentor';
import { BookingFlow, type BookingFlowProps } from './BookingFlow';

const mentor: Mentor = {
  id: 'm1',
  profileHref: '/mentors/olajuwon',
  name: 'Olajuwon Samuel',
  firstName: 'Olajuwon',
  initials: 'OS',
  photoUrl: null,
  photoFocus: null,
  tone: 1,
  degreeLine: 'MSc, Computer Science',
  institution: 'University of London',
  completedSessions: 23,
  reviewCount: 11,
  rating: 4.9,
  label: 'top-rated',
  offer: 'free',
  nextAvailableAt: null,
  nextAvailableState: 'none',
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

// ---- phones: the sheet (BookingModal.dc.html mobileView=sheet) --------------
// The organism stories cannot import ModalShell (a template), so this frame only
// lays out the three slots the flow hands over. `templates` has the real sheet.
const phoneShell: BookingFlowProps['renderShell'] = (shell, body) => (
  <div style={{ height: 760, display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '8px 16px', textAlign: 'center', fontSize: 14 }}>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{shell.sheet?.caption}</div>
      <strong>{shell.sheet?.heading}</strong>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
        left: {shell.sheet?.leading.label}
        {shell.sheet?.showClose ? ' · right: Close' : ''}
      </div>
    </div>
    <div style={{ padding: '0 16px 8px' }}>{shell.sheet?.progress}</div>
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px 16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {body}
    </div>
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 16,
        borderTop: '1px solid var(--border-muted)',
      }}
    >
      {shell.footer}
    </div>
  </div>
);
const phone = {
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  parameters: { layout: 'fullscreen' },
};

export const PhonePickTime: Story = { ...phone, args: { renderShell: phoneShell } };
export const PhoneGuest: Story = { ...phone, args: { renderShell: phoneShell, isGuest: true } };
export const PhoneSingleType: Story = {
  ...phone,
  args: { renderShell: phoneShell, options: { sessionTypes: [sessionTypes[0]!], days } },
};
export const PhoneOpenedOnType: Story = {
  ...phone,
  args: { renderShell: phoneShell, initialTypeId: 'st2', hideProfileLink: true },
};
export const PhoneLoading: Story = {
  ...phone,
  args: { renderShell: phoneShell, options: null, optionsLoading: true },
};
export const PhoneError: Story = {
  ...phone,
  args: { renderShell: phoneShell, options: null, optionsError: { kind: 'server', message: 'x' } },
};
export const PhoneSent: Story = { ...phone, args: { renderShell: phoneShell, requestDone: true } };
