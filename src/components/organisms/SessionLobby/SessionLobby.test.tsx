import { render, screen } from '@testing-library/react';
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
  meta: 'Sun, Oct 4 · 6:00 – 6:30 pm · Lagos (WAT) · EduFurther video',
  clock: { label: 'In session', value: '14:59', sub: '16 min left' },
  people: [person('me', 'away'), person('them', 'joined')] as [LobbyPerson, LobbyPerson],
};

describe('when Join goes away under the keyboard', () => {
  it('moves focus to the note that replaces it, not to the page body', () => {
    const { rerender } = render(
      <SessionLobby
        {...base}
        join={{ label: 'Join now', enabled: true, onJoin: vi.fn(), hint: 'Opens in your browser.' }}
      />,
    );
    screen.getByRole('button', { name: 'Join now' }).focus();
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
          onJoin: vi.fn(),
          hint: 'Opens in your browser.',
        }}
      />,
    );
    screen.getByRole('button', { name: 'Rejoin session' }).focus();
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
            onJoin: vi.fn(),
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

describe('Join as a link to the entry route (issue 207)', () => {
  const join = (over = {}) => ({
    label: 'Join now',
    enabled: true,
    href: '/sessions/b1/enter',
    hint: 'Opens in your browser.',
    ...over,
  });

  it('is a plain anchor opening a new tab, named as the button was', () => {
    render(<SessionLobby {...base} join={join()} />);
    const a = screen.getByRole('link', { name: 'Join now' });
    expect(a.tagName).toBe('A');
    expect(a).toHaveAttribute('href', '/sessions/b1/enter');
    expect(a).toHaveAttribute('target', '_blank');
    expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('button', { name: 'Join now' })).not.toBeInTheDocument();
  });

  it('is not next/link, so nothing prefetches a route that records an arrival', async () => {
    vi.resetModules();
    const link = vi.fn(() => null);
    vi.doMock('next/link', () => ({ default: link }));
    const { SessionLobby: Fresh } = await import('./SessionLobby');
    render(<Fresh {...base} join={join()} />);
    expect(link).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Join now' })).toBeInTheDocument();
    vi.doUnmock('next/link');
  });

  it('locked, it is the disabled button, with no link to follow', () => {
    render(<SessionLobby {...base} join={join({ enabled: false, label: 'Join opens in 5:00' })} />);
    expect(screen.queryByRole('link', { name: /Join/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join opens in 5:00' })).toBeDisabled();
  });
});
