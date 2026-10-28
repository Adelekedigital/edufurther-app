import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api/data/errors';
import { normaliseError } from '@/lib/api/data/errors';
import { resetFlags, viewers } from '@/app/_shell/lockedPage.harness';
import type { Chats } from '@/types/messages';
import { MessagesScreen } from './MessagesScreen';
import {
  chatRow,
  h,
  inbox,
  MENTOR,
  menteeRows,
  NOW,
  person,
  push,
  remote,
  replace,
  resetHarness,
  saveSettings,
  setPhone,
} from './messagesScreen.harness';

vi.mock('next/navigation', async () =>
  (await import('./messagesScreen.harness')).mocks.navigation(),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./messagesScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/messages', async () =>
  (await import('./messagesScreen.harness')).mocks.messages(),
);
vi.mock('@/lib/api/data/messageSend', async () =>
  (await import('./messagesScreen.harness')).chatMocks.messageSend(),
);
vi.mock('@/lib/api/data/goals', async () =>
  (await import('./messagesScreen.harness')).chatMocks.goals(),
);
vi.mock('@/lib/api/data/settings', async () =>
  (await import('./messagesScreen.harness')).chatMocks.settings(),
);
// The setup lock's flags (lockedPage.harness): on, so an unfinished mentee is locked.
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);

beforeEach(() => {
  resetHarness();
  resetFlags();
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
});
afterEach(() => vi.useRealTimers());

const list = () => within(screen.getByRole('region', { name: 'Messages' }));
const rowNames = () =>
  list()
    .queryAllByRole('button')
    .filter((b) => b.hasAttribute('aria-describedby'))
    .map((b) => b.getAttribute('aria-label'));

describe('Messages: the list', () => {
  it('shows each chat as drawn: name, unread count, role line, preview rules and the next-session chip', () => {
    render(<MessagesScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Messages' })).toBeInTheDocument();
    expect(rowNames()).toEqual(['Ujunwa Umeokeke, 2 unread', 'Hugh Momah', 'Gbenga Elufisan']);
    const ujunwa = list().getByRole('button', { name: 'Ujunwa Umeokeke, 2 unread' });
    expect(ujunwa).toHaveAccessibleDescription(
      /Mentor · Central European University.*See you Tuesday\..*Next: Tomorrow, /,
    );
    // A file alone, mine: "You: Sent a file: {name}".
    expect(list().getByRole('button', { name: 'Hugh Momah' })).toHaveAccessibleDescription(
      /You: Sent a file: CV\.pdf/,
    );
    // No messages yet, but a booking: the chip still shows.
    expect(list().getByRole('button', { name: 'Gbenga Elufisan' })).toHaveAccessibleDescription(
      /No messages yet.*Next: /,
    );
  });

  it('a deleted last message reads as deleted (Q9), never its text', () => {
    h.chats = inbox([
      chatRow({
        last: {
          kind: 'text',
          text: null,
          fileName: null,
          mine: false,
          at: NOW.toISOString(),
          deleted: true,
        },
      }),
      chatRow({
        person: person({ id: 'u2', name: 'Hugh Momah' }),
        last: {
          kind: 'text',
          text: null,
          fileName: null,
          mine: true,
          at: NOW.toISOString(),
          deleted: true,
        },
      }),
    ]);
    render(<MessagesScreen />);
    expect(list().getByRole('button', { name: 'Ujunwa Umeokeke' })).toHaveAccessibleDescription(
      /This message was deleted/,
    );
    expect(list().getByRole('button', { name: 'Hugh Momah' })).toHaveAccessibleDescription(
      /You deleted this message/,
    );
  });

  it('search matches name and institution as typed, and says so when nothing matches', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MessagesScreen />);
    const search = screen.getByRole('searchbox', { name: 'Search messages' });
    await user.type(search, 'toronto');
    expect(rowNames()).toEqual(['Gbenga Elufisan']);
    await user.clear(search);
    await user.type(search, 'hugh');
    expect(rowNames()).toEqual(['Hugh Momah']);
    await user.type(search, 'zzz');
    expect(rowNames()).toEqual([]);
    expect(screen.getByRole('heading', { name: 'No chats found' })).toBeInTheDocument();
  });

  it('Unread ({N}) keeps unread chats, and the one opened from it stays until you leave the filter', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { rerender } = render(<MessagesScreen />);
    await user.click(screen.getByRole('radio', { name: 'Unread (2)' }));
    expect(screen.getByRole('radio', { name: 'Unread (2)' })).toBeChecked();
    expect(rowNames()).toEqual(['Ujunwa Umeokeke, 2 unread']);
    await user.click(list().getByRole('button', { name: 'Ujunwa Umeokeke, 2 unread' }));
    // Read now: still listed while Unread is on.
    h.chats = inbox(menteeRows().map((r) => ({ ...r, unread: 0 })));
    rerender(<MessagesScreen />);
    expect(rowNames()).toEqual(['Ujunwa Umeokeke']);
    await user.click(screen.getByRole('radio', { name: 'All' }));
    await user.click(screen.getByRole('radio', { name: 'Unread' }));
    expect(rowNames()).toEqual([]);
    expect(screen.getByRole('heading', { name: 'No unread messages' })).toBeInTheDocument();
  });
});

describe('Messages: which chat is open', () => {
  it('desktop: the top row is open (no "Pick a chat"), tinted as current', () => {
    render(<MessagesScreen />);
    expect(screen.getByRole('region', { name: 'Chat with Ujunwa Umeokeke' })).toBeInTheDocument();
    expect(list().getByRole('button', { name: 'Ujunwa Umeokeke, 2 unread' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.queryByText('Pick a chat')).toBeNull();
  });

  it('?with= opens that chat; picking a row replaces it on desktop', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    h.search = 'with=u-hugh&mockViewer=mentee';
    render(<MessagesScreen />);
    expect(screen.getByRole('region', { name: 'Chat with Hugh Momah' })).toBeInTheDocument();
    await user.click(list().getByRole('button', { name: 'Gbenga Elufisan' }));
    expect(replace).toHaveBeenCalledWith('/messages?with=u-gbenga&mockViewer=mentee', {
      scroll: false,
    });
    expect(push).not.toHaveBeenCalled();
  });

  it('phones: the list alone until a row is tapped, which steps forward into the chat', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setPhone(true);
    render(<MessagesScreen />);
    expect(screen.queryByRole('region', { name: /^Chat with/ })).toBeNull();
    // No row is "current" with no chat beside the list.
    expect(list().getByRole('button', { name: 'Ujunwa Umeokeke, 2 unread' })).not.toHaveAttribute(
      'aria-current',
    );
    await user.click(list().getByRole('button', { name: 'Hugh Momah' }));
    expect(push).toHaveBeenCalledWith('/messages?with=u-hugh', { scroll: false });
  });

  it('desktop with no ?with=: the top of the list as shown opens, and Unread keeps it once read', () => {
    h.chats = inbox([
      chatRow({ person: person({ id: 'u-a', name: 'Ann Read' }) }),
      chatRow({ person: person({ id: 'u-b', name: 'Bo Unread' }), unread: 1 }),
      chatRow({ person: person({ id: 'u-c', name: 'Cy Unread' }), unread: 2 }),
    ]);
    const { rerender } = render(<MessagesScreen />);
    expect(screen.getByRole('region', { name: 'Chat with Ann Read' })).toBeInTheDocument();
    act(() => screen.getByRole('radio', { name: 'Unread (3)' }).click());
    expect(screen.getByRole('region', { name: 'Chat with Bo Unread' })).toBeInTheDocument();
    // Bo is read now: still listed and open, not handed to Cy.
    h.chats = inbox([
      chatRow({ person: person({ id: 'u-a', name: 'Ann Read' }) }),
      chatRow({ person: person({ id: 'u-b', name: 'Bo Unread' }) }),
      chatRow({ person: person({ id: 'u-c', name: 'Cy Unread' }), unread: 2 }),
    ]);
    rerender(<MessagesScreen />);
    expect(rowNames()).toEqual(['Bo Unread', 'Cy Unread, 2 unread']);
    expect(screen.getByRole('region', { name: 'Chat with Bo Unread' })).toBeInTheDocument();
  });

  it('phones: Back after opening from the list steps back; from a link it drops ?with=', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    setPhone(true);
    const { rerender, unmount } = render(<MessagesScreen />);
    await user.click(list().getByRole('button', { name: 'Hugh Momah' }));
    h.search = 'with=u-hugh';
    rerender(<MessagesScreen />);
    await user.click(screen.getByRole('button', { name: 'Back to messages' }));
    expect(historyBack).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    unmount();
    // Opened from a link (an email, a Message button): nothing to step back to here.
    render(<MessagesScreen />);
    await user.click(screen.getByRole('button', { name: 'Back to messages' }));
    expect(historyBack).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/messages', { scroll: false });
    historyBack.mockRestore();
  });

  it('a ?with= that is none of my chats says the chat isn’t available', () => {
    h.search = 'with=u-stranger';
    render(<MessagesScreen />);
    expect(screen.getByRole('heading', { name: 'This chat isn’t available.' })).toBeInTheDocument();
  });
});

describe('Messages: the chat header', () => {
  it('a mentee sees the mentor’s name as a link to their profile, and the next session', () => {
    render(<MessagesScreen />);
    const chat = within(screen.getByRole('region', { name: 'Chat with Ujunwa Umeokeke' }));
    expect(chat.getByRole('link', { name: 'Ujunwa Umeokeke' })).toHaveAttribute(
      'href',
      '/mentors/ujunwa-umeokeke',
    );
    expect(chat.getByText(/^Next session Tomorrow, /)).toBeInTheDocument();
    expect(chat.getByRole('button', { name: 'Back to messages' })).toBeInTheDocument();
  });

  it('a mentor sees the mentee’s name as plain text (Q3) and "{Role} · {institution}" with nothing booked', () => {
    h.viewer = MENTOR;
    h.chats = inbox([
      chatRow({
        person: person({
          id: 'u-gia',
          name: 'Gia Sajan',
          role: 'mentee',
          institution: 'Strathmore University',
          handle: null,
        }),
      }),
    ]);
    render(<MessagesScreen />);
    const chat = within(screen.getByRole('region', { name: 'Chat with Gia Sajan' }));
    expect(chat.queryByRole('link')).toBeNull();
    expect(chat.getByText('Gia Sajan')).toBeInTheDocument();
    expect(chat.getByText('Mentee · Strathmore University')).toBeInTheDocument();
  });
});

describe('Messages: the four states', () => {
  it('loading, or a viewer whose role isn’t known yet: a neutral skeleton, no role controls', () => {
    h.viewer = { kind: 'loading', signedIn: true };
    h.chats = remote<Chats>(null, { isLoading: true });
    render(<MessagesScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Messages' })).toBeInTheDocument();
    expect(screen.getByText('Loading your messages')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('button', { name: 'New message' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Find a mentor' })).toBeNull();
  });

  it('error is checked before empty, with Try again', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const retry = vi.fn();
    h.chats = remote<Chats>(null, { error: normaliseError(new ApiError(500)), retry });
    render(<MessagesScreen />);
    expect(
      screen.getByRole('heading', { name: 'We couldn’t load your messages.' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('No messages yet')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('the empty inbox: a mentee gets "Find a mentor"; a mentor gets their own line and no button', () => {
    h.chats = inbox([]);
    const { unmount } = render(<MessagesScreen />);
    expect(screen.getByRole('heading', { name: 'No messages yet' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'You can message a mentor once they confirm your booking. Your chats show up here.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find a mentor' })).toHaveAttribute('href', '/explore');
    unmount();
    h.viewer = MENTOR;
    render(<MessagesScreen />);
    expect(
      screen.getByText(
        'You can message a mentee once you confirm their booking. Your chats show up here.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Find a mentor' })).toBeNull();
  });

  it('a guest gets the log-in gate; an unfinished mentee gets the lock explainer and nothing is fetched', () => {
    h.viewer = { kind: 'guest' };
    const { unmount } = render(<MessagesScreen />);
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fmessages',
    );
    unmount();
    h.viewer = viewers.menteeUnfinished;
    render(<MessagesScreen />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Finish setting up to use Messages' }),
    ).toBeInTheDocument();
    expect(h.chatsActive).toBe(false);
  });
});

describe('Messages: New message', () => {
  it('lists connected people; picking one opens that chat; mentees get the Find a mentor line', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    h.people = remote([
      person({ id: 'u-gbenga', name: 'Gbenga Elufisan', institution: 'University of Toronto' }),
    ]);
    render(<MessagesScreen />);
    await user.click(screen.getByRole('button', { name: 'New message' }));
    const dialog = within(screen.getByRole('dialog', { name: 'New message' }));
    expect(
      dialog.getByText('Mentors you’ve connected with through approved requests or past sessions.'),
    ).toBeInTheDocument();
    expect(dialog.getByRole('link', { name: 'Find a mentor' })).toHaveAttribute('href', '/explore');
    await user.click(dialog.getByRole('button', { name: /Gbenga Elufisan/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(replace).toHaveBeenCalledWith('/messages?with=u-gbenga', { scroll: false });
  });

  it('searches by name, and says so when no one matches; mentors get no Find a mentor line', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    h.viewer = MENTOR;
    render(<MessagesScreen />);
    await user.click(screen.getByRole('button', { name: 'New message' }));
    const dialog = within(screen.getByRole('dialog', { name: 'New message' }));
    await user.type(dialog.getByRole('searchbox', { name: 'Search people' }), 'zed');
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(h.peopleQuery).toBe('zed');
    expect(dialog.getByText('No one matches that name.')).toBeInTheDocument();
    expect(dialog.queryByRole('link', { name: 'Find a mentor' })).toBeNull();
  });

  it('with nothing typed and no one connected, it says how people connect (not "no match")', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MessagesScreen />);
    await user.click(screen.getByRole('button', { name: 'New message' }));
    const dialog = within(screen.getByRole('dialog', { name: 'New message' }));
    expect(
      dialog.getByText('You can message a mentor once they confirm your booking.'),
    ).toBeInTheDocument();
    expect(dialog.queryByText('No one matches that name.')).toBeNull();
  });

  it('someone connected since the last poll: the list is read again, and the chat waits for it', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const retry = vi.fn();
    h.chats = { ...inbox(menteeRows()), retry };
    h.people = remote([person({ id: 'u-new', name: 'Ada New' })]);
    const { rerender } = render(<MessagesScreen />);
    await user.click(screen.getByRole('button', { name: 'New message' }));
    await user.click(screen.getByRole('button', { name: /Ada New/ }));
    expect(retry).toHaveBeenCalled();
    h.search = 'with=u-new';
    h.refreshing = true;
    rerender(<MessagesScreen />);
    expect(screen.queryByRole('heading', { name: 'This chat isn’t available.' })).toBeNull();
    // The read came back without them: now it says so.
    h.refreshing = false;
    rerender(<MessagesScreen />);
    expect(screen.getByRole('heading', { name: 'This chat isn’t available.' })).toBeInTheDocument();
  });
});

describe('Messages: Message emails', () => {
  it('the switch saves on flip; Done closes with the toast for the saved state', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    h.settings = remote({ unreadEmails: false });
    const { rerender } = render(<MessagesScreen />);
    await user.click(screen.getByRole('button', { name: 'Message settings' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Message emails' }));
    const sw = dialog.getByRole('switch', { name: 'Email me about unread messages' });
    expect(sw).not.toBeChecked();
    expect(
      dialog.getByText(
        'Messages sent from 15 minutes before a session to 15 minutes after it starts are emailed right away, even with this off.',
      ),
    ).toBeInTheDocument();
    await user.click(sw);
    expect(saveSettings).toHaveBeenCalledWith({ unreadEmails: true });
    // The cache now holds the saved value, as the real (optimistic) hook does.
    rerender(<MessagesScreen />);
    expect(dialog.getByRole('switch', { name: 'Email me about unread messages' })).toBeChecked();
    await user.click(dialog.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await screen.findByText('Unread message emails are on.')).toBeInTheDocument();
  });

  it('while a flip is saving, Done waits: no toast for a value that may roll back', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    h.saving = true;
    render(<MessagesScreen />);
    await user.click(screen.getByRole('button', { name: 'Message settings' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Message emails' }));
    await user.click(dialog.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('dialog', { name: 'Message emails' })).toBeInTheDocument();
    expect(screen.queryByText(/^Unread message emails are/)).toBeNull();
  });

  it('?settings=1 opens it; closing drops the param', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    h.search = 'settings=1&mockViewer=mentee';
    render(<MessagesScreen />);
    const dialog = within(screen.getByRole('dialog', { name: 'Message emails' }));
    expect(replace).not.toHaveBeenCalled();
    await user.click(dialog.getByRole('button', { name: 'Done' }));
    expect(replace).toHaveBeenCalledWith('/messages?mockViewer=mentee', { scroll: false });
  });

  it('a save that failed says so', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    h.saveFailed = true;
    render(<MessagesScreen />);
    await user.click(screen.getByRole('button', { name: 'Message settings' }));
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t save that. Try again.');
  });
});
