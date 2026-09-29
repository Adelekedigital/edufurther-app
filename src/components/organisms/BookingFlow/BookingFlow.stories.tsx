import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { AppError, Mentor, Remote, SessionType } from '@/types/mentor';
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
      {
        id: 'q1',
        label: 'What would you like to cover?',
        kind: 'text',
        required: false,
        options: [],
      },
    ],
  },
  {
    id: 'st2',
    name: 'CV review',
    durationMin: 60,
    description: 'Line by line.',
    // Every question kind (backend #268 + #12): answer, pick one, pick any, upload.
    questions: [
      { id: 'q2', label: 'Upload your current CV', kind: 'file', required: true, options: [] },
      {
        id: 'q3',
        label: 'When do you start?',
        kind: 'single',
        required: true,
        options: [
          { id: 'o1', label: 'Fall 2027' },
          { id: 'o2', label: 'Spring 2028' },
        ],
      },
      {
        id: 'q4',
        label: 'Which parts worry you most?',
        kind: 'multi',
        required: false,
        options: [
          { id: 'o3', label: 'Essays' },
          { id: 'o4', label: 'Funding' },
          { id: 'o5', label: 'Visa' },
        ],
      },
      {
        id: 'q5',
        label: 'Anything else I should know?',
        kind: 'text',
        required: false,
        options: [],
      },
    ],
  },
];
// Bookable instants, as GET …/availability/slots returns them (UTC).
const slots = [0, 1, 2, 3, 4].flatMap((i) =>
  [9, 13].map((h) => `2026-09-${28 + i}T${String(h).padStart(2, '0')}:00:00Z`),
);
const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: fn(),
  ...over,
});
const failed: AppError = { kind: 'server', message: 'x' };

/** Rendered without the ModalShell: the page supplies the frame via renderShell. */
const meta: Meta<typeof BookingFlow> = {
  title: 'Organisms/BookingFlow',
  component: BookingFlow,
  args: {
    mentor,
    sessionTypes: remote(sessionTypes),
    sessionTypeId: null,
    onSessionTypeChange: fn(),
    slots: remote(slots),
    isGuest: false,
    onSignup: fn(),
    onRequest: fn(),
    // Resolves like POST /me/intake-files after a moment.
    onUpload: (f: File) =>
      new Promise((r) => setTimeout(() => r({ id: 'file-1', name: f.name, size: f.size }), 800)),
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
export const SingleSessionType: Story = { args: { sessionTypes: remote([sessionTypes[0]!]) } };
/** An offering that asks nothing (every offering until the backend ships questions). */
export const NoQuestions: Story = {
  args: { sessionTypeId: 'st2', sessionTypes: remote([{ ...sessionTypes[1]!, questions: [] }]) },
};
export const LoadingSessions: Story = {
  args: { sessionTypes: remote<SessionType[]>(null, { isLoading: true }) },
};
export const SessionsError: Story = {
  args: { sessionTypes: remote<SessionType[]>(null, { error: failed }) },
};
export const LoadingSlots: Story = { args: { slots: remote<string[]>(null, { isLoading: true }) } };
export const SlotsError: Story = { args: { slots: remote<string[]>(null, { error: failed }) } };
export const NoOpenTimes: Story = { args: { slots: remote([]) } };
export const RequestFailed: Story = {
  args: {
    requestError: { kind: 'conflict', message: 'That time was just taken. Pick another time.' },
  },
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
  args: { renderShell: phoneShell, sessionTypes: remote([sessionTypes[0]!]) },
};
export const PhoneOpenedOnType: Story = {
  ...phone,
  args: { renderShell: phoneShell, sessionTypeId: 'st2', hideProfileLink: true },
};
export const PhoneLoading: Story = {
  ...phone,
  args: { renderShell: phoneShell, slots: remote<string[]>(null, { isLoading: true }) },
};
export const PhoneError: Story = {
  ...phone,
  args: { renderShell: phoneShell, slots: remote<string[]>(null, { error: failed }) },
};
export const PhoneSent: Story = { ...phone, args: { renderShell: phoneShell, requestDone: true } };
export const PhoneNoOpenTimes: Story = {
  ...phone,
  args: { renderShell: phoneShell, slots: remote([]) },
};

/** The questions step with every kind (pick CV review, then a time). */
export const AllQuestionKinds: Story = { args: { sessionTypeId: 'st2' } };
/** Uploads are refused (e.g. not a PDF / Word file): the reason and Try again. */
export const UploadRefused: Story = {
  args: {
    sessionTypeId: 'st2',
    onUpload: () =>
      Promise.reject({
        kind: 'validation',
        message: 'Upload a PDF or Word (.docx) file under 5 MB.',
      }),
  },
};
/** The server refused one answer: the message shows under that question. */
export const AnswerRefused: Story = {
  args: {
    sessionTypeId: 'st2',
    requestError: {
      kind: 'validation',
      message: 'Check your answer to this question, then send again.',
      questionId: 'q3',
    },
  },
};
