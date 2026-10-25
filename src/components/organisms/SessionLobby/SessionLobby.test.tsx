import { fireEvent, render, screen } from '@testing-library/react';
import { sampleParty } from '@/lib/utils/bookingTestFixtures';
import { SessionLobby, type LobbyPerson } from './SessionLobby';

const person = (id: string, tone: LobbyPerson['tone']): LobbyPerson => ({
  person: sampleParty({ id }),
  name: id,
  presence: 'Joined',
  tone,
});

const base = {
  ground: 'green' as const,
  status: { tone: 'green' as const, label: 'In progress', live: true },
  title: '1:1 call with Amara Okafor',
  meta: 'Sun, Oct 4 · 6:00 – 6:30 pm · EduFurther video',
  clock: null,
  people: [person('me', 'away'), person('them', 'joined')] as [LobbyPerson, LobbyPerson],
};

describe('when Join goes away under the keyboard', () => {
  it('moves focus to the note that replaces it, not to the page body', () => {
    const { rerender } = render(
      <SessionLobby
        {...base}
        join={{
          label: 'Join now',
          enabled: true,
          href: '/x/enter',
          hint: 'Opens in your browser.',
        }}
      />,
    );
    screen.getByRole('link', { name: 'Join now (opens in a new tab)' }).focus();
    rerender(
      <SessionLobby {...base} note="Joining closed at 6:15 pm, 15 minutes after the start." />,
    );
    expect(screen.getByText(/Joining closed at 6:15 pm/)).toHaveFocus();
  });

  it('moves focus to the title when nothing replaces Join (the session settled)', () => {
    const { rerender } = render(
      <SessionLobby
        {...base}
        join={{
          label: 'Rejoin session',
          enabled: true,
          href: '/x/enter',
          hint: 'Opens in your browser.',
        }}
      />,
    );
    screen.getByRole('link', { name: 'Rejoin session (opens in a new tab)' }).focus();
    rerender(<SessionLobby {...base} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('leaves focus alone when it was somewhere else', () => {
    const { rerender } = render(
      <>
        <button type="button">Elsewhere</button>
        <SessionLobby
          {...base}
          join={{
            label: 'Join now',
            enabled: true,
            href: '/x/enter',
            hint: 'Opens in your browser.',
          }}
        />
      </>,
    );
    screen.getByRole('button', { name: 'Elsewhere' }).focus();
    rerender(
      <>
        <button type="button">Elsewhere</button>
        <SessionLobby {...base} note="Joining closed at 6:15 pm, 15 minutes after the start." />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
  });
});

describe('when the links go away under the keyboard', () => {
  const noop = () => {};
  const both = [
    { key: 'reschedule', icon: 'update' as const, label: 'Reschedule', onClick: noop },
    { key: 'cancel', icon: 'event_busy' as const, label: 'Cancel', onClick: noop, danger: true },
  ];
  const locked = { label: 'Join opens in 00:01', enabled: false as const, hint: 'Soon.' };
  const open = {
    label: 'Join session',
    enabled: true as const,
    href: '/x/enter',
    hint: 'Opens in your browser.',
  };

  it('Join opens and the row goes: focus moves to Join, not the page body', () => {
    const { rerender } = render(<SessionLobby {...base} join={locked} links={both} />);
    screen.getByRole('button', { name: /Reschedule/ }).focus();
    rerender(<SessionLobby {...base} join={open} links={[]} />);
    expect(screen.getByRole('link', { name: 'Join session (opens in a new tab)' })).toHaveFocus();
  });

  it('one link goes and others stay: focus moves to the first one left', () => {
    const { rerender } = render(<SessionLobby {...base} join={locked} links={both} />);
    screen.getByRole('button', { name: /Cancel/ }).focus();
    rerender(<SessionLobby {...base} join={locked} links={[both[0]!]} />);
    expect(screen.getByRole('button', { name: /Reschedule/ })).toHaveFocus();
  });

  it('nothing else to go to: the title', () => {
    const { rerender } = render(<SessionLobby {...base} links={both} />);
    screen.getByRole('button', { name: /Cancel/ }).focus();
    rerender(<SessionLobby {...base} links={[]} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('leaves focus alone when it was somewhere else', () => {
    const { rerender } = render(
      <>
        <button type="button">Elsewhere</button>
        <SessionLobby {...base} join={locked} links={both} />
      </>,
    );
    screen.getByRole('button', { name: 'Elsewhere' }).focus();
    rerender(
      <>
        <button type="button">Elsewhere</button>
        <SessionLobby {...base} join={open} links={[]} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
  });
});

describe('Join as a link to the entry route (issue 207)', () => {
  const join = (over = {}) => ({
    label: 'Join now',
    enabled: true as const,
    href: '/sessions/b1/enter',
    hint: 'Opens in your browser.',
    ...over,
  });

  it('is a plain anchor opening a new tab, named as the button was', () => {
    render(<SessionLobby {...base} join={join()} />);
    const a = screen.getByRole('link', { name: 'Join now (opens in a new tab)' });
    expect(a.tagName).toBe('A');
    expect(a).toHaveAttribute('href', '/sessions/b1/enter');
    expect(a).toHaveAttribute('target', '_blank');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    expect(
      screen.queryByRole('button', { name: 'Join now (opens in a new tab)' }),
    ).not.toBeInTheDocument();
  });

  it('is not next/link, so nothing prefetches a route that records an arrival', async () => {
    vi.resetModules();
    const link = vi.fn(() => null);
    vi.doMock('next/link', () => ({ default: link }));
    const { SessionLobby: Fresh } = await import('./SessionLobby');
    render(<Fresh {...base} join={join()} />);
    expect(link).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Join now (opens in a new tab)' })).toBeInTheDocument();
    vi.doUnmock('next/link');
  });

  it('locked, it is the disabled button, with no link to follow', () => {
    render(
      <SessionLobby
        {...base}
        join={{ enabled: false, label: 'Join opens in 5:00', hint: 'Opens in your browser.' }}
      />,
    );
    expect(screen.queryByRole('link', { name: /Join/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join opens in 5:00' })).toBeDisabled();
  });

  it('tells the page when Join is followed, by click or middle-click, not by right-click', () => {
    const onFollow = vi.fn();
    render(<SessionLobby {...base} join={join({ onFollow })} />);
    const a = screen.getByRole('link', { name: 'Join now (opens in a new tab)' });
    a.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(a);
    expect(onFollow).toHaveBeenCalledTimes(1);
    fireEvent(a, new MouseEvent('auxclick', { bubbles: true, button: 2 }));
    expect(onFollow).toHaveBeenCalledTimes(1);
    fireEvent(a, new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    expect(onFollow).toHaveBeenCalledTimes(2);
  });
});
