import { render, screen } from '@testing-library/react';
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
      { id: 'q1', label: 'What would you like to cover?', kind: 'text', required: false },
    ],
  },
  { id: 'st2', name: 'CV review', durationMin: 45, description: 'CV.', questions: [] },
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
    await user.click(screen.getAllByRole('radio')[2]!); // first time of the first day
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByTestId('sheet')).toHaveTextContent('right close');
    const footer = screen.getByTestId('footer');
    expect(footer.querySelectorAll('button')).toHaveLength(1);
  });

  it('shows no chosen-time row over the done, loading or error states', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BookingFlow {...props()} />);
    await user.click(screen.getAllByRole('radio')[2]!);
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
});

describe('BookingFlow on real slots', () => {
  beforeEach(() => setPhone(false));

  it('has no questions step when the offering asks none: the time step requests', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', onRequest })} />);
    expect(screen.getByRole('progressbar', { name: /Step 1 of 1/ })).toBeInTheDocument();
    await user.click(screen.getAllByRole('radio')[2]!);
    await user.click(screen.getByRole('button', { name: /^Request Mon, Sep 28/ }));
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({ sessionTypeId: 'st2', startsAt: '2026-09-28T09:00:00Z' }),
    );
  });

  it('a guest with no questions requests straight after signing up', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', isGuest: true, onRequest })} />);
    await user.click(screen.getAllByRole('radio')[2]!);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('groups the days in the zone the viewer picked', () => {
    // 02:00Z on Sep 29 is still Sep 28 in New York.
    render(
      <BookingFlow
        {...props({ slots: remote(['2026-09-29T02:00:00Z']), deviceZone: 'America/New_York' })}
      />,
    );
    expect(screen.getByText('Sep 28')).toBeInTheDocument();
    expect(screen.getByText('10:00 pm')).toBeInTheDocument();
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
    await user.click(screen.getAllByRole('radio')[2]!); // Sep 28 09:00
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
    await user.click(screen.getAllByRole('radio')[1]!);
    expect(screen.getByRole('progressbar', { name: /Step 1 of 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('drops a chosen time the grid no longer offers (taken meanwhile)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BookingFlow {...props()} />);
    await user.click(screen.getAllByRole('radio')[2]!);
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    rerender(<BookingFlow {...props({ slots: remote(['2026-09-29T13:00:00Z']) })} />);
    expect(screen.getByRole('progressbar', { name: /Step 1 of 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });
});
