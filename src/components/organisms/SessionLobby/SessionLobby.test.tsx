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
