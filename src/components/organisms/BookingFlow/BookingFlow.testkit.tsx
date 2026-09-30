import type { Mentor, Remote, SessionType } from '@/types/mentor';
import type { BookingFlowProps } from './BookingFlow';

/** Shared by the BookingFlow test files: fixtures, props, the pinned clock and the phone switch. */
export const mentor: Mentor = {
  id: 'm1',
  profileHref: '/mentors/m1',
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
  nextAvailableState: 'open',
  takingBookings: true,
  topics: [],
};
// st1 has a question (the shape the backend will ship); st2 has none, as today.
export const sessionTypes: SessionType[] = [
  {
    id: 'st1',
    name: 'General mentorship',
    durationMin: 60,
    description: 'Open.',
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
  { id: 'st2', name: 'CV review', durationMin: 45, description: 'CV.', questions: [] },
];
/** Every question kind (only the questions-step tests offer it). */
export const allKinds: SessionType[] = [
  {
    id: 'st3',
    name: 'Application check',
    durationMin: 45,
    description: 'Every question kind.',
    questions: [
      { id: 'qf', label: 'Upload your CV', kind: 'file', required: true, options: [] },
      {
        id: 'qs',
        label: 'What is it for?',
        kind: 'single',
        required: true,
        options: [
          { id: 'o1', label: 'Masters' },
          { id: 'o2', label: 'PhD' },
        ],
      },
      {
        id: 'qm',
        label: 'Which parts worry you?',
        kind: 'multi',
        required: false,
        options: [
          { id: 'm1', label: 'Structure' },
          { id: 'm2', label: 'Wording' },
        ],
      },
      { id: 'qt', label: 'Anything else?', kind: 'text', required: false, options: [] },
    ],
  },
];
export const slots = ['2026-09-28T09:00:00Z', '2026-09-29T13:00:00Z'];
export const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

/** A shell that prints what the flow hands over, so tests can read it. */
export const renderShell: BookingFlowProps['renderShell'] = (shell, body) => (
  <div>
    <p data-testid="title">{shell.title}</p>
    {shell.sheet && (
      <div data-testid="sheet">
        <span>{shell.sheet.caption}</span>
        <h2>{shell.sheet.heading}</h2>
        <button onClick={shell.sheet.leading.onClick}>{shell.sheet.leading.label}</button>
        {shell.sheet.showClose && <span>right close</span>}
      </div>
    )}
    {body}
    {shell.footer && <div data-testid="footer">{shell.footer}</div>}
  </div>
);

export const props = (over: Partial<BookingFlowProps> = {}): BookingFlowProps => ({
  mentor,
  sessionTypes: remote(sessionTypes),
  sessionTypeId: 'st1',
  onSessionTypeChange: vi.fn(),
  slots: remote(slots),
  isGuest: false,
  onSignup: vi.fn(),
  onRequest: vi.fn(),
  requestPending: false,
  requestDone: false,
  requestError: null,
  onClose: vi.fn(),
  deviceZone: 'UTC',
  renderShell,
  ...over,
});

/** The week view always starts today: pin it to Sunday, Sep 27 2026. */
export function pinToday() {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-27T12:00:00Z'));
  });
  afterAll(() => vi.useRealTimers());
}

export function setPhone(phone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: phone && query.includes('max-width: 767px'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}
