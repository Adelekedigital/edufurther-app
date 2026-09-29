import { useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mentor, Remote, SessionType } from '@/types/mentor';
import { BookingFlow, type BookingFlowProps } from './BookingFlow';

const mentor: Mentor = {
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
  topics: [],
};
// st1 has a question (the shape the backend will ship); st2 has none, as today.
const sessionTypes: SessionType[] = [
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
const allKinds: SessionType[] = [
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
const slots = ['2026-09-28T09:00:00Z', '2026-09-29T13:00:00Z'];
const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

/** A shell that prints what the flow hands over, so tests can read it. */
const renderShell: BookingFlowProps['renderShell'] = (shell, body) => (
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

const props = (over: Partial<BookingFlowProps> = {}): BookingFlowProps => ({
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

// The week view always starts today; pin it to Sunday, Sep 27 2026.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-27T12:00:00Z'));
});
afterAll(() => vi.useRealTimers());

function setPhone(phone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: phone && query.includes('max-width: 767px'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('BookingFlow on phones (sheet)', () => {
  beforeEach(() => setPhone(true));

  it('the session summary says it’s free and uses a credit', () => {
    render(<BookingFlow {...props()} />);
    expect(screen.getByText(/· \d+ min · Free · 1 credit$/)).toBeInTheDocument();
  });

  it('starts with close on the left and no close on the right', () => {
    render(<BookingFlow {...props()} />);
    const sheet = screen.getByTestId('sheet');
    expect(sheet).toHaveTextContent('Step 1 of 2');
    expect(sheet).toHaveTextContent('Pick a date and time');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(sheet).not.toHaveTextContent('right close');
  });

  it('moves back to the header after step 1 and keeps one footer action', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props()} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByTestId('sheet')).toHaveTextContent('right close');
    const footer = screen.getByTestId('footer');
    expect(footer.querySelectorAll('button')).toHaveLength(1);
  });

  it('shows no chosen-time row over the done, loading or error states', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BookingFlow {...props()} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    expect(screen.getByRole('button', { name: /^Change/ })).toBeInTheDocument();

    rerender(<BookingFlow {...props({ requestDone: true })} />);
    expect(screen.getByText('Request sent')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Change/ })).not.toBeInTheDocument();

    rerender(
      <BookingFlow
        {...props({ sessionTypes: remote<SessionType[]>(null, { isLoading: true }) })}
      />,
    );
    expect(screen.queryByRole('button', { name: /^Change/ })).not.toBeInTheDocument();

    rerender(
      <BookingFlow
        {...props({
          sessionTypes: remote<SessionType[]>(null, { error: { kind: 'server', message: 'x' } }),
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: /^Change/ })).not.toBeInTheDocument();
  });

  it('opens on the given session type and can hide the profile link', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', hideProfileLink: true })} />);
    expect(screen.getByText('CV review')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /CV review/ }));
    expect(screen.queryByRole('link', { name: 'View profile' })).not.toBeInTheDocument();
  });
});

describe('BookingFlow on wider screens', () => {
  beforeEach(() => setPhone(false));

  it('hands over no sheet chrome and keeps Cancel and Next in the body', () => {
    render(<BookingFlow {...props()} />);
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('footer')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View profile' })).toBeInTheDocument();
  });

  it('shows the price, Free, and the credit it uses, next to the length', () => {
    render(<BookingFlow {...props()} />);
    const aside = screen.getByRole('complementary', { name: 'Session' });
    expect(aside).toHaveTextContent(/Price\s*Free\s*(toll)?\s*Uses 1 credit/);
    expect(aside).toHaveTextContent(/Length\s*\d+ min/);
  });
});

describe('BookingFlow on real slots', () => {
  beforeEach(() => setPhone(false));

  it('has no questions step when the offering asks none: the time step requests', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', onRequest })} />);
    // Design #39: one step → no "Step 1 of 1" caption and no step bar.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/Step 1 of 1/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: /^Request Mon, Sep 28/ }));
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({ sessionTypeId: 'st2', startsAt: '2026-09-28T09:00:00Z' }),
    );
  });

  it('a guest with no questions requests straight after signing up', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', isGuest: true, onRequest })} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('a guest stays on step 2 of 2 while their request sends (review of #26)', async () => {
    const user = userEvent.setup();
    const reasons = [
      { icon: 'flight_takeoff' as const, k: 'Made the move you’re planning.', v: 'From A to B.' },
    ];
    const { rerender } = render(
      <BookingFlow {...props({ sessionTypeId: 'st2', isGuest: true, firstReasons: reasons })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    rerender(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          isGuest: true,
          firstReasons: reasons,
          requestPending: true,
        })}
      />,
    );
    expect(screen.getByRole('progressbar', { name: /Step 2 of 2/ })).toBeInTheDocument();
    expect(screen.queryByText(/first mentees/)).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: '9:00 am' })).not.toBeInTheDocument();
  });

  it('a guest with questions stays on the questions while sending and after an error', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BookingFlow {...props({ sessionTypeId: 'st1', isGuest: true })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    expect(screen.getByRole('progressbar', { name: /Step 3 of 3/ })).toBeInTheDocument();
    for (const over of [
      { requestPending: true },
      { requestError: { kind: 'offline', message: 'x' } as const },
    ]) {
      rerender(<BookingFlow {...props({ sessionTypeId: 'st1', isGuest: true, ...over })} />);
      expect(screen.getByRole('progressbar', { name: /Step 3 of 3/ })).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'Email address' })).not.toBeInTheDocument();
      expect(screen.getByText('What would you like to cover?')).toBeInTheDocument();
    }
  });

  it('a guest error without questions stays on step 2, signed up, with a retry and no second sign-up', async () => {
    const user = userEvent.setup();
    const onSignup = vi.fn();
    const onRequest = vi.fn();
    const base = { sessionTypeId: 'st2', isGuest: true, onSignup, onRequest };
    const { rerender } = render(<BookingFlow {...props(base)} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    rerender(
      <BookingFlow {...props({ ...base, requestError: { kind: 'offline', message: 'x' } })} />,
    );
    expect(screen.getByRole('progressbar', { name: /Step 2 of 2/ })).toBeInTheDocument();
    // No second sign-up form: they're signed up, and the button retries.
    expect(screen.queryByRole('textbox', { name: 'Email address' })).not.toBeInTheDocument();
    expect(screen.getByText('Signed up as a@b.co')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Request Mon, Sep 28/ }));
    expect(onRequest).toHaveBeenCalledTimes(2);
    expect(onSignup).toHaveBeenCalledTimes(1);
  });

  it('a double-click on "Continue with Google" books once (review r3 of #26)', async () => {
    const user = userEvent.setup();
    const onSignup = vi.fn();
    const onRequest = vi.fn();
    render(
      <BookingFlow {...props({ sessionTypeId: 'st2', isGuest: true, onSignup, onRequest })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.dblClick(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onSignup).toHaveBeenCalledTimes(1);
  });

  it('a double-click on "Continue with email" books once (review r4 of #26)', async () => {
    const user = userEvent.setup();
    const onSignup = vi.fn();
    const onRequest = vi.fn();
    render(
      <BookingFlow {...props({ sessionTypeId: 'st2', isGuest: true, onSignup, onRequest })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    // The second click lands on the same footer button, now "Request …",
    // before the page's requestPending arrives.
    await user.dblClick(screen.getByRole('button', { name: 'Continue with email' }));
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onSignup).toHaveBeenCalledTimes(1);
  });

  it('Back is disabled while a request is out', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BookingFlow {...props({ sessionTypeId: 'st1' })} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: /^Continue/ }));
    rerender(<BookingFlow {...props({ sessionTypeId: 'st1', requestPending: true })} />);
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('"Change" is disabled while a request is out (review r4 of #26)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BookingFlow {...props({ sessionTypeId: 'st1' })} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: /^Continue/ }));
    rerender(<BookingFlow {...props({ sessionTypeId: 'st1', requestPending: true })} />);
    expect(screen.getByRole('button', { name: /^Change/ })).toBeDisabled();
  });

  it('Cancel still closes while a request is out (review r4 of #26)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', requestPending: true, onClose })} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('going back after signing up skips the sign-up step', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props({ sessionTypeId: 'st1', isGuest: true })} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('progressbar', { name: /Step 1 of 3/ })).toBeInTheDocument();
    // And forward again goes straight to the questions.
    await user.click(screen.getByRole('button', { name: /^Continue/ }));
    expect(screen.getByText('What would you like to cover?')).toBeInTheDocument();
  });

  it('groups the days in the zone the viewer picked', () => {
    // 02:00Z on Sep 29 is still Sep 28 in New York.
    render(
      <BookingFlow
        {...props({ slots: remote(['2026-09-29T02:00:00Z']), deviceZone: 'America/New_York' })}
      />,
    );
    expect(screen.getByText('Mon, Sep 28 · 1 time')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '10:00 pm' })).toBeInTheDocument();
  });

  it('says so when the offering has no open times', () => {
    render(<BookingFlow {...props({ slots: remote([]) })} />);
    expect(screen.getByText('No open times at the moment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });

  it('shows a slots error with a retry', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(
      <BookingFlow
        {...props({
          slots: remote<string[]>(null, { error: { kind: 'server', message: 'x' }, retry }),
        })}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('asks the page for the other offering when the type changes', async () => {
    const user = userEvent.setup();
    const onSessionTypeChange = vi.fn();
    render(<BookingFlow {...props({ onSessionTypeChange })} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Session type' }), 'st2');
    expect(onSessionTypeChange).toHaveBeenCalledWith('st2');
  });

  it('stays on the time step when a new time is picked after the old one was taken', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BookingFlow {...props({ sessionTypeId: 'st2', isGuest: true })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' })); // Sep 28
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('progressbar', { name: /Step 2 of 2/ })).toBeInTheDocument();

    // Slots reload without that time: back to the time step.
    rerender(
      <BookingFlow
        {...props({ sessionTypeId: 'st2', isGuest: true, slots: remote(['2026-09-29T13:00:00Z']) })}
      />,
    );
    expect(screen.getByRole('progressbar', { name: /Step 1 of 2/ })).toBeInTheDocument();

    // Picking the remaining time must not jump ahead to sign-up by itself.
    await user.click(screen.getByRole('radio', { name: '1:00 pm' }));
    expect(screen.getByRole('progressbar', { name: /Step 1 of 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('drops a chosen time the grid no longer offers (taken meanwhile)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BookingFlow {...props()} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    rerender(<BookingFlow {...props({ slots: remote(['2026-09-29T13:00:00Z']) })} />);
    expect(screen.getByRole('progressbar', { name: /Step 1 of 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });
});

describe('BookingFlow week view (7 days at a time)', () => {
  beforeEach(() => setPhone(false));

  it('says no open times when none of the four weeks has any, even if the fetch had some beyond', () => {
    // Today is Sep 27; Oct 25 is today+28, fetched as margin but never shown.
    render(<BookingFlow {...props({ slots: remote(['2026-10-25T12:00:00Z']) })} />);
    expect(screen.getByText('No open times at the moment')).toBeInTheDocument();
  });

  it('clears the chosen time when the week changes', async () => {
    const user = userEvent.setup();
    render(
      <BookingFlow
        {...props({ sessionTypeId: 'st2', slots: remote([...slots, '2026-10-06T09:00:00Z']) })}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    expect(screen.getByRole('button', { name: /^Request Mon, Sep 28/ })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });

  it('moves the week on at midnight while the modal is open', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    try {
      vi.setSystemTime(new Date('2026-09-27T23:59:30Z'));
      render(<BookingFlow {...props()} />);
      expect(screen.getByText('Next 7 days · Sep 27 – Oct 3')).toBeInTheDocument();
      vi.setSystemTime(new Date('2026-09-28T00:00:30Z'));
      act(() => vi.advanceTimersByTime(60 * 1000));
      expect(screen.getByText('Next 7 days · Sep 28 – Oct 4')).toBeInTheDocument();
    } finally {
      // Back to the file's pinned clock, pass or fail, so later tests see Sep 27.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-27T12:00:00Z'));
    }
  });

  it('always opens on the next 7 days from today, empty days disabled', () => {
    render(<BookingFlow {...props()} />);
    expect(screen.getByText('Next 7 days · Sep 27 – Oct 3')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Sun, Sep 27, no open times/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Mon, Sep 28, 1 time/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Earlier dates' })).toBeDisabled();
  });

  it('opens on a given time: its week, its day, the time picked', () => {
    render(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          slots: remote([...slots, '2026-10-06T09:00:00Z']),
          // A different spelling of the same instant still matches.
          initialTime: '2026-10-06T09:00:00.000+00:00',
        })}
      />,
    );
    expect(screen.getByText('Oct 4 – Oct 10')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Tue, Oct 6, 1 time/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: '9:00 am' })).toBeChecked();
    expect(screen.getByRole('button', { name: /^Request Tue, Oct 6/ })).toBeEnabled();
  });

  it('applies the time when the slots arrive after the modal opened, once', async () => {
    const user = userEvent.setup();
    const later = [...slots, '2026-10-06T09:00:00Z'];
    const { rerender } = render(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          slots: remote<string[]>(null, { isLoading: true }),
          initialTime: '2026-10-06T09:00:00Z',
        })}
      />,
    );
    rerender(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          slots: remote(later),
          initialTime: '2026-10-06T09:00:00Z',
        })}
      />,
    );
    expect(screen.getByRole('radio', { name: '9:00 am' })).toBeChecked();
    expect(screen.getByText('Oct 4 – Oct 10')).toBeInTheDocument();
    // A refetch after the viewer moved on doesn't pull them back.
    await user.click(screen.getByRole('button', { name: 'Earlier dates' }));
    rerender(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          slots: remote([...later]),
          initialTime: '2026-10-06T09:00:00Z',
        })}
      />,
    );
    expect(screen.getByText('Next 7 days · Sep 27 – Oct 3')).toBeInTheDocument();
  });

  it('finds the time on another offering, and says so when no offering has it', () => {
    // A page stand-in: it owns the offering and serves each one's slots.
    const byType: Record<string, string[]> = { st1: slots, st2: ['2026-10-01T15:00:00Z'] };
    function Page({ initialTime }: { initialTime: string }) {
      const [typeId, setTypeId] = useState('st1');
      return (
        <BookingFlow
          {...props({
            sessionTypeId: typeId,
            onSessionTypeChange: setTypeId,
            slots: remote(byType[typeId]!),
            initialTime,
          })}
        />
      );
    }
    const { unmount } = render(<Page initialTime="2026-10-01T15:00:00Z" />);
    expect(screen.getByRole('button', { name: /^Request Thu, Oct 1/ })).toBeEnabled();
    expect(screen.queryByText(/just taken/)).not.toBeInTheDocument();
    unmount();

    render(<Page initialTime="2026-10-02T15:00:00Z" />);
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(
      'That time was just taken. Here’s what’s open.',
    );
    // Back on the first offering, nothing picked.
    expect(screen.getByRole('combobox')).toHaveValue('st1');
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });

  it('a load error is not "time taken", and a successful retry picks the time', async () => {
    const user = userEvent.setup();
    const time = '2026-10-01T15:00:00Z';
    function Page() {
      const [typeId, setTypeId] = useState('st1');
      const [st1, setSt1] = useState<Remote<string[]>>(
        remote<string[]>(null, {
          error: { kind: 'offline', message: 'x' },
          retry: () => setSt1(remote([...slots, time])),
        }),
      );
      const byType: Record<string, Remote<string[]>> = { st1, st2: remote(slots) };
      return (
        <BookingFlow
          {...props({
            sessionTypeId: typeId,
            onSessionTypeChange: setTypeId,
            slots: byType[typeId]!,
            initialTime: time,
          })}
        />
      );
    }
    render(<Page />);
    // st1 failed, st2 loaded without it: back on st1 with its load error, no "taken".
    expect(screen.getByRole('combobox')).toHaveValue('st1');
    expect(screen.getByText('We couldn’t load available times')).toBeInTheDocument();
    expect(screen.queryByText(/just taken/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('radio', { name: /Thu, Oct 1/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: '3:00 pm' })).toBeChecked();
  });

  it('stops looking once the viewer picks an offering', async () => {
    const user = userEvent.setup();
    function Page() {
      const [typeId, setTypeId] = useState('st1');
      // st2 never finishes loading: the search would wait on it.
      const byType: Record<string, Remote<string[]>> = {
        st1: remote(slots),
        st2: remote<string[]>(null, { isLoading: true }),
      };
      return (
        <BookingFlow
          {...props({
            sessionTypeId: typeId,
            onSessionTypeChange: setTypeId,
            slots: byType[typeId]!,
            initialTime: '2026-10-02T15:00:00Z',
          })}
        />
      );
    }
    render(<Page />);
    expect(screen.getByRole('combobox')).toHaveValue('st2');
    await user.selectOptions(screen.getByRole('combobox'), 'st1');
    expect(screen.getByRole('combobox')).toHaveValue('st1');
    expect(screen.getByRole('radio', { name: /Mon, Sep 28, 1 time/ })).toBeInTheDocument();
    expect(screen.queryByText(/just taken/)).not.toBeInTheDocument();
  });

  it('an empty week offers the next week with times, or points back', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <BookingFlow {...props({ sessionTypeId: 'st2', slots: remote(['2026-10-13T09:00:00Z']) })} />,
    );
    expect(screen.getByText('No open times this week')).toBeInTheDocument();
    expect(screen.getByText('Try later dates.')).toBeInTheDocument();
    // Oct 13 is in the third week (Oct 11 – Oct 17), past an empty second week.
    await user.click(screen.getByRole('button', { name: 'Show Oct 11 – Oct 17' }));
    expect(screen.getByText('Oct 11 – Oct 17')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Tue, Oct 13, 1 time/ })).toBeChecked();
    unmount();
    // Nothing later in the four weeks, but this week had times: no link, and
    // it points back rather than saying "Check back soon" (review of #26).
    render(
      <BookingFlow {...props({ sessionTypeId: 'st2', slots: remote(['2026-09-27T20:00:00Z']) })} />,
    );
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    expect(screen.getByText('Try earlier dates.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Show / })).not.toBeInTheDocument();
  });

  it('the week link keeps focus in the modal, on the new week’s chosen day', async () => {
    const user = userEvent.setup();
    render(
      <BookingFlow {...props({ sessionTypeId: 'st2', slots: remote(['2026-10-13T09:00:00Z']) })} />,
    );
    await user.click(screen.getByRole('button', { name: 'Show Oct 11 – Oct 17' }));
    expect(screen.getByRole('radio', { name: /Tue, Oct 13, 1 time/ })).toHaveFocus();
  });

  it('an empty week after the open ones says to try earlier dates', async () => {
    const user = userEvent.setup();
    render(
      <BookingFlow {...props({ sessionTypeId: 'st2', slots: remote(['2026-09-28T09:00:00Z']) })} />,
    );
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    expect(screen.getByText('Try earlier dates.')).toBeInTheDocument();
    expect(screen.queryByText('Check back soon.')).not.toBeInTheDocument();
  });

  it('shows the first-mentees reasons on the first step only, when given', async () => {
    const user = userEvent.setup();
    const reasons = [
      {
        icon: 'flight_takeoff' as const,
        k: 'Made the move you’re planning.',
        v: 'From Nigeria to the United States.',
      },
    ];
    const { unmount } = render(
      <BookingFlow {...props({ sessionTypeId: 'st1', firstReasons: reasons })} />,
    );
    expect(screen.getByText('Be one of Olajuwon’s first mentees')).toBeInTheDocument();
    expect(screen.getByText('Made the move you’re planning.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: /^Continue/ }));
    expect(screen.queryByText(/first mentees/)).not.toBeInTheDocument();
    unmount();
    render(<BookingFlow {...props({ sessionTypeId: 'st1', firstReasons: [] })} />);
    expect(screen.queryByText(/first mentees/)).not.toBeInTheDocument();
  });

  it('opens on this week even when the first time is later, and ‹ › reach it', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props({ slots: remote(['2026-10-06T09:00:00Z']) })} />);
    expect(screen.getByText(/No open times this week/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    expect(screen.getByText('Oct 4 – Oct 10')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Tue, Oct 6, 1 time/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    expect(screen.getByRole('button', { name: 'Later dates' })).toBeDisabled();
  });

  describe('the questions step (backend PRs 268, 12, 282)', () => {
    const toQuestions = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('radio', { name: '9:00 am' }));
      await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    };
    const cv = new File(['%PDF-1.7'], 'cv.pdf', { type: 'application/pdf' });

    it('asks every kind; required answers and a finished upload gate the request', async () => {
      const user = userEvent.setup();
      const onRequest = vi.fn();
      let finish: (f: { id: string; name: string; size: number }) => void = () => {};
      const onUpload = vi.fn(
        () => new Promise<{ id: string; name: string; size: number }>((r) => (finish = r)),
      );
      render(
        <BookingFlow
          {...props({ sessionTypes: remote(allKinds), sessionTypeId: 'st3', onRequest, onUpload })}
        />,
      );
      await toQuestions(user);
      const send = () => screen.getByRole('button', { name: /^Request Mon, Sep 28/ });
      expect(send()).toBeDisabled();

      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      expect(onUpload).toHaveBeenCalledWith(cv);
      expect(screen.getByText(/Uploading cv\.pdf/)).toBeInTheDocument();
      await user.click(screen.getByRole('radio', { name: 'PhD' }));
      // Still uploading: nothing sends.
      expect(send()).toBeDisabled();
      await act(async () => finish({ id: 'f1', name: 'cv.pdf', size: 8 }));
      expect(send()).toBeEnabled();

      await user.click(screen.getByRole('button', { name: 'Wording' }));
      await user.type(screen.getByRole('textbox', { name: 'Anything else?' }), 'Due Friday');
      await user.click(send());
      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTypeId: 'st3',
          answers: {
            qf: { file: { id: 'f1', name: 'cv.pdf', size: 8 } },
            qs: { optionIds: ['o2'] },
            qm: { optionIds: ['m2'] },
            qt: { text: 'Due Friday' },
          },
        }),
      );
    });

    it('a refused upload says why and can be retried with the same file', async () => {
      const user = userEvent.setup();
      const onUpload = vi
        .fn()
        .mockRejectedValueOnce({
          kind: 'validation',
          message: 'Upload a PDF or Word (.docx) file under 5 MB.',
        })
        .mockResolvedValueOnce({ id: 'f2', name: 'cv.pdf', size: 8 });
      render(
        <BookingFlow
          {...props({ sessionTypes: remote(allKinds), sessionTypeId: 'st3', onUpload })}
        />,
      );
      await toQuestions(user);
      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      expect(
        await screen.findByText('Upload a PDF or Word (.docx) file under 5 MB.'),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(onUpload).toHaveBeenLastCalledWith(cv);
      expect(await screen.findByText('cv.pdf attached')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('an upload that lands after a session-type switch is dropped, and nothing waits on it (review of #62)', async () => {
      const user = userEvent.setup();
      const onRequest = vi.fn();
      let finish: (f: { id: string; name: string; size: number }) => void = () => {};
      const onUpload = vi.fn(
        () => new Promise<{ id: string; name: string; size: number }>((r) => (finish = r)),
      );
      const types = [...allKinds, sessionTypes[1]!]; // st3 (every kind), st2 (none)
      function Harness() {
        const [typeId, setTypeId] = useState('st3');
        return (
          <BookingFlow
            {...props({
              sessionTypes: remote(types),
              sessionTypeId: typeId,
              onSessionTypeChange: setTypeId,
              onRequest,
              onUpload,
            })}
          />
        );
      }
      render(<Harness />);
      await toQuestions(user);
      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      await user.click(screen.getByRole('button', { name: 'Back' }));
      await user.selectOptions(screen.getByRole('combobox', { name: 'Session type' }), 'st2');
      await user.click(screen.getByRole('radio', { name: '9:00 am' }));
      const send = screen.getByRole('button', { name: /^Request Mon, Sep 28/ });
      // The other type's upload doesn't hold this one up.
      expect(send).toBeEnabled();
      await act(async () => finish({ id: 'f1', name: 'cv.pdf', size: 8 }));
      await user.click(send);
      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({ sessionTypeId: 'st2', answers: {} }),
      );
    });

    it('a refused answer to a question not on screen says so at the bottom', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <BookingFlow {...props({ sessionTypes: remote(allKinds), sessionTypeId: 'st3' })} />,
      );
      await toQuestions(user);
      rerender(
        <BookingFlow
          {...props({
            sessionTypes: remote(allKinds),
            sessionTypeId: 'st3',
            requestError: { kind: 'validation', message: 'Check your answer.', questionId: 'gone' },
          })}
        />,
      );
      expect(screen.getByRole('alert')).toHaveTextContent('Check your answer.');
    });

    it('a file the server can’t use any more is dropped, so the field asks for it again', async () => {
      const user = userEvent.setup();
      const onUpload = vi.fn().mockResolvedValue({ id: 'f1', name: 'cv.pdf', size: 8 });
      const base = { sessionTypes: remote(allKinds), sessionTypeId: 'st3', onUpload };
      const { rerender } = render(<BookingFlow {...props(base)} />);
      await toQuestions(user);
      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      expect(await screen.findByText('cv.pdf attached')).toBeInTheDocument();
      rerender(
        <BookingFlow
          {...props({
            ...base,
            requestError: {
              kind: 'validation',
              message: 'Upload the file again: that one can’t be used any more.',
              questionId: 'qf',
              fileGone: true,
            },
          })}
        />,
      );
      expect(screen.queryByText('cv.pdf attached')).toBeNull();
      expect(screen.getByRole('alert')).toHaveTextContent('Upload the file again');
    });

    it('after "Upload the file again", the new file stays through the page re-rendering (review r2 of #62)', async () => {
      const user = userEvent.setup();
      const onUpload = vi
        .fn()
        .mockResolvedValueOnce({ id: 'f1', name: 'cv.pdf', size: 8 })
        .mockResolvedValueOnce({ id: 'f2', name: 'cv.pdf', size: 8 });
      // One error object, as the hook now returns; the page re-renders on its own.
      const gone = {
        kind: 'validation' as const,
        message: 'Upload the file again: that one can’t be used any more.',
        questionId: 'qf',
        fileGone: true,
      };
      let bump: () => void = () => {};
      function Page({ error }: { error: typeof gone | null }) {
        const [, setN] = useState(0);
        bump = () => setN((n) => n + 1);
        return (
          <BookingFlow
            {...props({
              sessionTypes: remote(allKinds),
              sessionTypeId: 'st3',
              onUpload,
              requestError: error,
            })}
          />
        );
      }
      const { rerender } = render(<Page error={null} />);
      await toQuestions(user);
      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      expect(await screen.findByText('cv.pdf attached')).toBeInTheDocument();
      rerender(<Page error={gone} />);
      expect(screen.queryByText('cv.pdf attached')).toBeNull();
      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      expect(await screen.findByText('cv.pdf attached')).toBeInTheDocument();
      act(() => bump());
      act(() => bump());
      expect(screen.getByText('cv.pdf attached')).toBeInTheDocument();
    });

    it('the file input stays focusable while uploading (review of #62)', async () => {
      const user = userEvent.setup();
      const onUpload = vi.fn(
        () => new Promise<{ id: string; name: string; size: number }>(() => {}),
      );
      render(
        <BookingFlow
          {...props({ sessionTypes: remote(allKinds), sessionTypeId: 'st3', onUpload })}
        />,
      );
      await toQuestions(user);
      const input = screen.getByLabelText(/Upload your CV/);
      await user.upload(input, cv);
      expect(input).not.toBeDisabled();
      expect(input).toHaveAttribute('aria-disabled', 'true');
      await user.upload(input, cv);
      expect(onUpload).toHaveBeenCalledTimes(1);
    });

    it('an answer the server refused shows under that question, not at the bottom', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <BookingFlow {...props({ sessionTypes: remote(allKinds), sessionTypeId: 'st3' })} />,
      );
      await toQuestions(user);
      rerender(
        <BookingFlow
          {...props({
            sessionTypes: remote(allKinds),
            sessionTypeId: 'st3',
            requestError: {
              kind: 'validation',
              message: 'Check your answer to this question, then send again.',
              questionId: 'qs',
            },
          })}
        />,
      );
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Check your answer to this question');
      expect(
        within(screen.getByRole('group', { name: /What is it for\?/ })).getByRole('alert'),
      ).toBe(alert);
    });
  });
});
