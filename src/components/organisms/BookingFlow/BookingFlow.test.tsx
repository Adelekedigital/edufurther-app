import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BookingDay, Mentor, SessionType } from '@/types/mentor';
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
const sessionTypes: SessionType[] = [
  { id: 'st1', name: 'General mentorship', durationMin: 60, description: 'Open.', questions: [] },
  { id: 'st2', name: 'CV review', durationMin: 45, description: 'CV.', questions: [] },
];
const days: BookingDay[] = [
  { date: '2026-09-28', slots: [{ startsAt: '2026-09-28T09:00:00Z' }] },
  { date: '2026-09-29', slots: [{ startsAt: '2026-09-29T13:00:00Z' }] },
];

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
  options: { sessionTypes, days },
  optionsLoading: false,
  optionsError: null,
  onRetryOptions: vi.fn(),
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

    rerender(<BookingFlow {...props({ optionsLoading: true })} />);
    expect(screen.queryByRole('button', { name: /^Change/ })).not.toBeInTheDocument();

    rerender(
      <BookingFlow {...props({ options: null, optionsError: { kind: 'server', message: 'x' } })} />,
    );
    expect(screen.queryByRole('button', { name: /^Change/ })).not.toBeInTheDocument();
  });

  it('opens on the requested session type and can hide the profile link', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props({ initialTypeId: 'st2', hideProfileLink: true })} />);
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
