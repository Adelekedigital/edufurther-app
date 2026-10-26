import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenteeNewView } from './MenteeNewView';
import type { ProfileField } from './newMentee';

const fields = (done: number): ProfileField[] =>
  (['target', 'help', 'education', 'bio'] as const).map((key, i) => ({
    key,
    label: {
      target: 'What you’re applying for',
      help: 'What you need help with',
      education: 'Education',
      bio: 'Short bio',
    }[key],
    value: i < done ? 'Saved' : null,
  }));

const props = (over: Partial<Parameters<typeof MenteeNewView>[0]> = {}) => ({
  profileDone: false,
  booked: null,
  firstDone: null,
  invited: false,
  friendJoined: false,
  fields: fields(3),
  unlocked: false,
  freeSessions: 1,
  goal: 'Master’s in Public Health, United Kingdom',
  timeZone: 'Africa/Lagos',
  phone: false,
  invite: {
    url: 'https://edufurther.test/invite/damilola-7k2x',
    urlLoading: false,
    urlError: false,
    onRetry: vi.fn(),
  },
  onOpenProfile: vi.fn(),
  onOpenInvite: vi.fn(),
  onChooseMentor: vi.fn(),
  onHide: null,
  ...over,
});

const booked = { mentorFirst: 'Mariam', startsAt: '2026-10-29T17:00:00Z', confirmed: false };

describe('MenteeNewView', () => {
  it('incomplete: the profile card with its meter, and Complete profile opens the sheet', async () => {
    const p = props();
    render(<MenteeNewView {...p} />);
    expect(screen.getByText('Your next step')).toBeInTheDocument();
    expect(screen.getByText('3 of 4 done · Next: short bio')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Complete profile' }));
    expect(p.onOpenProfile).toHaveBeenCalled();
  });

  it('ready: book your first session, worded with the goal, and Choose your mentor', async () => {
    const p = props({ profileDone: true, fields: fields(4) });
    render(<MenteeNewView {...p} />);
    expect(screen.getByText('1 free session ready')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your profile is complete. Pick a mentor who has already done what you’re aiming for: Master’s in Public Health, United Kingdom.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Choose your mentor' }));
    expect(p.onChooseMentor).toHaveBeenCalled();
  });

  it('booked: the invite card, its kicker naming the request, with the link to copy and share', () => {
    render(<MenteeNewView {...props({ profileDone: true, booked })} />);
    // The kicker and the Getting started note both name it.
    expect(screen.getAllByText(/^Requested with Mariam · Thu, Oct 29, 6:00 pm$/i)).toHaveLength(2);
    expect(
      screen.getByRole('heading', { name: 'Get 3 free sessions every month' }),
    ).toBeInTheDocument();
    expect(screen.getByText('edufurther.test/invite/damilola-7k2x')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy invite link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
  });

  it('a confirmed first booking reads "Booked with"', () => {
    render(<MenteeNewView {...props({ booked: { ...booked, confirmed: true } })} />);
    expect(screen.getAllByText(/^Booked with Mariam · /).length).toBeGreaterThan(0);
  });

  it('Getting started: counts, dots and notes follow the steps', () => {
    render(
      <MenteeNewView {...props({ profileDone: true, fields: fields(4), booked, invited: true })} />,
    );
    const list = screen.getByRole('list');
    expect(screen.getByText('4 of 4 done')).toBeInTheDocument();
    expect(
      within(list).getByText(
        'Link shared · Starts when a friend joins and you attend your first session',
      ),
    ).toBeInTheDocument();
    expect(within(list).getByText(/^Requested with Mariam/)).toBeInTheDocument();
  });

  it('the current step is marked as the current one, and the book step leads to Explore', () => {
    render(<MenteeNewView {...props({ profileDone: true, fields: fields(4) })} />);
    const items = screen.getAllByRole('listitem');
    const book = within(items[2]!).getByRole('link');
    expect(book).toHaveAttribute('aria-current', 'step');
    expect(book).toHaveAttribute('href', '/explore');
  });

  it('the current step is the one the card is about, whatever else is done', () => {
    const now = () =>
      screen
        .getAllByRole('listitem')
        .flatMap((li) => (li.querySelector('[aria-current="step"]') ? [li.textContent] : []));
    // Booked, profile short, nothing shared: the card is the invite, so is the step.
    const { unmount } = render(<MenteeNewView {...props({ booked })} />);
    expect(now()).toEqual([expect.stringMatching(/Invite a friend/)]);
    unmount();
    // Booked and shared with the profile short: "One step left" is the profile.
    render(<MenteeNewView {...props({ booked, invited: true })} />);
    expect(screen.getByText('One step left')).toBeInTheDocument();
    expect(now()).toEqual([expect.stringMatching(/Complete your profile/)]);
  });

  it('no free session known: the ready card promises none', () => {
    render(
      <MenteeNewView {...props({ profileDone: true, fields: fields(4), freeSessions: null })} />,
    );
    expect(screen.queryByText(/free sessions? ready/)).not.toBeInTheDocument();
    expect(screen.getByText('Your next step')).toBeInTheDocument();
  });

  it('Hide shows only when the screen offers it', async () => {
    const onHide = vi.fn();
    render(<MenteeNewView {...props({ booked, onHide })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(onHide).toHaveBeenCalled();
  });

  it('a friend who joined: the invite note says what is next', () => {
    render(<MenteeNewView {...props({ booked, friendJoined: true })} />);
    expect(
      screen.getByText('Friend joined ✓ · Next: attend your first session'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your friend joined. Attend your first session to get 3 free sessions every month.',
      ),
    ).toBeInTheDocument();
  });
});
