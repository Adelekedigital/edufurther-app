import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, normaliseError } from '@/lib/api/data/errors';
import type { Message, Thread } from '@/types/messages';
import { MessagesScreen } from './MessagesScreen';
import {
  ago,
  chatRow,
  h,
  inbox,
  loadOlder,
  markRead,
  MENTOR,
  menteeRows,
  NOW,
  person,
  push,
  remote,
  resetHarness,
  retried,
  sent,
  setPhone,
  thread,
} from './messagesScreen.harness';
import { reportHref } from './ChatMenu';

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

let seq = 0;
const msg = (mine: boolean, at: string, body: string | null, over: Partial<Message> = {}) => ({
  id: `m${++seq}`,
  clientId: null,
  mine,
  body,
  file: null,
  sentAt: at,
  editedAt: null,
  deleted: false,
  ...over,
});

const UJ = 'u-ujunwa';
const open = (t: Partial<Thread>, id = UJ) => {
  h.threads[id] = remote(thread(t));
  h.search = `with=${id}`;
};
/** A menu item's words, without its icon's ligature text. */
const menuName = (m: HTMLElement) => m.textContent?.replace(/^[a-z_]+/, '') ?? '';
const chat = () => within(screen.getByRole('region', { name: /^Chat with/ }));

beforeEach(() => {
  resetHarness();
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true });
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});
afterEach(() => vi.useRealTimers());

describe('the thread', () => {
  it('draws the privacy line, days, the "{N} new" divider, bubbles, ticks, edits and deleted lines', () => {
    open({
      myLastReadAt: ago(60 * 24),
      theirLastReadAt: ago(60 * 25),
      items: [
        msg(true, ago(60 * 26), 'Hi Ujunwa'),
        msg(true, ago(60 * 24.5), 'Here it is'),
        msg(false, ago(60 * 24.2), 'Thanks', { editedAt: ago(60 * 24.1) }),
        msg(false, ago(30), 'Read your draft.'),
        msg(false, ago(20), null, { deleted: true }),
        msg(true, ago(10), null, { deleted: true }),
      ],
    });
    render(<MessagesScreen />);
    const c = chat();
    expect(
      c.getByText(
        'Only you and Ujunwa can see this chat. If you report it, our team can review it.',
      ),
    ).toBeInTheDocument();
    expect(c.getByText('Yesterday')).toBeInTheDocument();
    expect(c.getByText('Today')).toBeInTheDocument();
    // Theirs since my read mark: one (the deleted one doesn't count).
    expect(c.getByRole('separator')).toHaveTextContent('1 new');
    // Mine: read up to their mark, sent after it.
    expect(c.getAllByRole('img', { name: 'Read' })).toHaveLength(1);
    expect(c.getAllByRole('img', { name: 'Sent' })).toHaveLength(1);
    expect(c.getByText('Edited ·')).toBeInTheDocument();
    expect(c.getByText('This message was deleted')).toBeInTheDocument();
    expect(c.getByText('You deleted this message')).toBeInTheDocument();
  });

  it('"Show earlier messages" only when there is more, and it loads the page before', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open({ hasMore: true, items: [msg(false, ago(5), 'Hi')] });
    render(<MessagesScreen />);
    await user.click(chat().getByRole('button', { name: 'Show earlier messages' }));
    expect(loadOlder).toHaveBeenCalled();
  });

  it('my unsent messages: Waiting to send offline; Not sent with Try again, and a toast once it goes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open({ items: [msg(false, ago(5), 'Hi')] });
    h.outbox = [
      {
        clientId: 'c1',
        to: UJ,
        body: 'Queued one',
        file: null,
        createdAt: ago(2),
        status: 'waiting',
      },
      {
        clientId: 'c2',
        to: UJ,
        body: 'Failed one',
        file: null,
        createdAt: ago(1),
        status: 'failed',
      },
    ];
    render(<MessagesScreen />);
    expect(chat().getByText('Waiting to send')).toBeInTheDocument();
    const alert = chat().getByRole('alert');
    expect(alert).toHaveTextContent('Not sent.');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(retried).toHaveBeenCalledWith('c2');
    expect(await screen.findByText('Message sent.')).toBeInTheDocument();
  });

  it('a 404 chat is gone: no composer, nothing to retry', () => {
    h.threads[UJ] = remote<Thread>(null, { error: normaliseError(new ApiError(404)) });
    h.search = `with=${UJ}`;
    render(<MessagesScreen />);
    expect(screen.getByRole('heading', { name: 'This chat isn’t available.' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('any other failed read says so, with Try again', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const retry = vi.fn();
    h.threads[UJ] = remote<Thread>(null, { error: normaliseError(new ApiError(500)), retry });
    h.search = `with=${UJ}`;
    render(<MessagesScreen />);
    expect(
      chat().getByRole('heading', { name: 'We couldn’t load this chat.' }),
    ).toBeInTheDocument();
    await user.click(chat().getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
    expect(chat().queryByRole('textbox')).toBeNull();
  });
});

describe('read marking', () => {
  it('marks up to the newest of theirs while the chat is open and the page visible', () => {
    open({
      items: [msg(false, ago(9), 'One'), msg(false, ago(5), 'Two'), msg(true, ago(1), 'Mine')],
    });
    render(<MessagesScreen />);
    const newest = h.threads[UJ]!.data!.items[1]!.id;
    expect(markRead).toHaveBeenCalledWith({ withId: UJ, upTo: newest }, expect.anything());
    expect(markRead).toHaveBeenCalledTimes(1);
  });

  it('nothing new past my read mark: no write', () => {
    open({ myLastReadAt: ago(1), items: [msg(false, ago(5), 'Old'), msg(true, ago(2), 'Mine')] });
    render(<MessagesScreen />);
    expect(markRead).not.toHaveBeenCalled();
  });

  it('a failed /read is tried again with the next poll', () => {
    markRead.mockImplementationOnce((_v: unknown, o?: { onError?: () => void }) => o?.onError?.());
    open({ items: [msg(false, ago(5), 'Two')] });
    const { rerender } = render(<MessagesScreen />);
    expect(markRead).toHaveBeenCalledTimes(1);
    // The poll answers: a new read of the same chat.
    h.threads[UJ] = remote({ ...h.threads[UJ]!.data! });
    rerender(<MessagesScreen />);
    expect(markRead).toHaveBeenCalledTimes(2);
  });

  it('never while the page is hidden; once it shows, it does', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    open({ items: [msg(false, ago(5), 'Two')] });
    render(<MessagesScreen />);
    expect(markRead).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(markRead).toHaveBeenCalledTimes(1);
  });

  it('a phone showing the list opens no chat, so nothing is read', () => {
    setPhone(true);
    h.threads[UJ] = remote(thread({ items: [msg(false, ago(5), 'Two')] }));
    render(<MessagesScreen />);
    expect(markRead).not.toHaveBeenCalled();
    expect(h.threadAsked).not.toContain(UJ);
  });
});

describe('an empty chat and its starters', () => {
  const gbenga = person({
    id: 'u-gbenga',
    name: 'Gbenga Elufisan',
    firstName: 'Gbenga',
    institution: 'University of Toronto',
  });

  it('mentee, a session upcoming: the confirmed line and the chips from their goal', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    h.goal = {
      degree_goal: { code: 'masters' },
      degree_goal_raw: null,
      field_of_study: 'Public Policy',
      target_start_term: 'Fall 2027',
      needs: [{ code: 'school-selection' }],
    };
    open({ person: gbenga }, 'u-gbenga');
    render(<MessagesScreen />);
    const c = chat();
    expect(c.getByRole('heading', { name: 'Say hello to Gbenga' })).toBeInTheDocument();
    expect(
      c.getByText(/^Gbenga confirmed your session for .+\. Say hi and share/),
    ).toBeInTheDocument();
    expect(c.getByText('Not sure what to say? Tap one to start.')).toBeInTheDocument();
    const chips = c
      .getAllByRole('button')
      .map((b) => b.textContent)
      .filter((t) => /^(Introduce|Share|Ask)/.test(t ?? ''));
    expect(chips).toEqual([
      'Introduce yourself',
      'Share what to cover',
      'Ask what to prepare',
      'Ask about your school',
    ]);
    await user.click(c.getByRole('button', { name: 'Introduce yourself' }));
    const box = c.getByRole('textbox', { name: 'Message Gbenga' });
    expect(box).toHaveValue(
      'Hi Gbenga, I’m Amara. I’m applying for a master’s in Public Policy for Fall 2027. Looking forward to our session!',
    );
    expect(box).toHaveFocus();
    expect(sent).not.toHaveBeenCalled();
    await user.click(c.getByRole('button', { name: 'Share what to cover' }));
    expect(box).toHaveValue('Hi Gbenga, in our session I’d love to focus on choosing a school.');
  });

  it('a chip whose data is missing is hidden', () => {
    h.chats = inbox([chatRow({ person: { ...gbenga, institution: null }, last: null })]);
    open({ person: { ...gbenga, institution: null } }, 'u-gbenga');
    render(<MessagesScreen />);
    expect(chat().queryByRole('button', { name: 'Introduce yourself' })).toBeNull();
    expect(chat().queryByRole('button', { name: 'Share what to cover' })).toBeNull();
    expect(chat().queryByRole('button', { name: 'Ask about your school' })).toBeNull();
    expect(chat().getByRole('button', { name: 'Ask what to prepare' })).toBeInTheDocument();
  });

  it('mentor with nothing upcoming: the Q5 line and the three mentor chips', () => {
    h.viewer = MENTOR;
    const gia = person({
      id: 'u-gia',
      name: 'Gia Sajan',
      firstName: 'Gia',
      role: 'mentee',
      handle: null,
    });
    h.chats = inbox([chatRow({ person: gia, last: null })]);
    open({ person: gia }, 'u-gia');
    render(<MessagesScreen />);
    expect(chat().getByText('Pick up where your last session left off.')).toBeInTheDocument();
    for (const name of ['Welcome them', 'Ask for documents', 'Share how to prepare'])
      expect(chat().getByRole('button', { name })).toBeInTheDocument();
  });
});

describe('the composer', () => {
  it('Send is off while empty; Enter sends on desktop; the box empties', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open({ items: [msg(false, ago(5), 'Hi')] });
    render(<MessagesScreen />);
    const box = chat().getByRole('textbox', { name: 'Message Ujunwa' });
    expect(box).toHaveAttribute('maxlength', '2000');
    expect(chat().getByRole('button', { name: 'Send' })).toBeDisabled();
    await user.type(box, 'See you then{Enter}');
    expect(sent).toHaveBeenCalledWith({ to: UJ, body: 'See you then', file: null });
    expect(box).toHaveValue('');
  });

  it('an Enter that ends an IME composition never sends', () => {
    open({ items: [msg(false, ago(5), 'Hi')] });
    render(<MessagesScreen />);
    const box = chat().getByRole('textbox', { name: 'Message Ujunwa' });
    fireEvent.change(box, { target: { value: '你好' } });
    fireEvent.keyDown(box, { key: 'Enter', keyCode: 229 });
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
    expect(sent).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(sent).toHaveBeenCalledWith({ to: UJ, body: '你好', file: null });
  });

  it('a held Enter sends one message', () => {
    open({ items: [msg(false, ago(5), 'Hi')] });
    render(<MessagesScreen />);
    const box = chat().getByRole('textbox', { name: 'Message Ujunwa' });
    fireEvent.change(box, { target: { value: 'Once' } });
    fireEvent.keyDown(box, { key: 'Enter', repeat: true });
    expect(sent).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.keyDown(box, { key: 'Enter', repeat: true });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(sent).toHaveBeenCalledTimes(1);
  });

  it('phones: Enter adds a line; the button sends', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setPhone(true);
    open({ items: [msg(false, ago(5), 'Hi')] });
    render(<MessagesScreen />);
    const box = chat().getByRole('textbox', { name: 'Message Ujunwa' });
    await user.type(box, 'One{Enter}Two');
    expect(sent).not.toHaveBeenCalled();
    expect(box).toHaveValue('One\nTwo');
    await user.click(chat().getByRole('button', { name: 'Send' }));
    expect(sent).toHaveBeenCalledWith({ to: UJ, body: 'One\nTwo', file: null });
  });

  it('contact details show the notice, which never blocks sending', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open({ items: [msg(false, ago(5), 'Hi')] });
    render(<MessagesScreen />);
    await user.type(chat().getByRole('textbox', { name: 'Message Ujunwa' }), 'Mail me at a@b.co');
    expect(
      chat().getByText(/^Sharing contact details\? Keep your chat and files here too\./),
    ).toBeInTheDocument();
    expect(chat().getByRole('button', { name: 'Send' })).toBeEnabled();
  });

  it('offline: says messages go when the connection is back', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    open({ items: [msg(false, ago(5), 'Hi')] });
    render(<MessagesScreen />);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(
      chat().getByText('You’re offline. We’ll send your messages when you’re back online.'),
    ).toBeInTheDocument();
    online.mockRestore();
  });

  it('each chat keeps its draft while you switch chats', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    open({ items: [msg(false, ago(5), 'Hi')] });
    h.threads['u-hugh'] = remote(thread({ person: person({ id: 'u-hugh', firstName: 'Hugh' }) }));
    const { rerender } = render(<MessagesScreen />);
    await user.type(chat().getByRole('textbox', { name: 'Message Ujunwa' }), 'Half a thought');
    h.search = 'with=u-hugh';
    rerender(<MessagesScreen />);
    expect(chat().getByRole('textbox', { name: 'Message Hugh' })).toHaveValue('');
    h.search = `with=${UJ}`;
    rerender(<MessagesScreen />);
    expect(chat().getByRole('textbox', { name: 'Message Ujunwa' })).toHaveValue('Half a thought');
  });
});

describe('read-only chats', () => {
  it('a paused mentor: the line instead of the composer', () => {
    open({ lock: 'paused', items: [msg(false, ago(5), 'Good luck')] });
    render(<MessagesScreen />);
    expect(chat().getByRole('status')).toHaveTextContent(
      'Ujunwa isn’t taking messages right now. You can still read your chat.',
    );
    expect(chat().queryByRole('textbox')).toBeNull();
  });

  it('a closed account (mentor viewing): its own line', () => {
    h.viewer = MENTOR;
    const gone = person({
      id: 'u-closed',
      name: 'Deleted user',
      firstName: 'Deleted user',
      role: 'mentee',
      handle: null,
      institution: null,
      state: 'closed',
    });
    h.chats = inbox([chatRow({ person: gone })]);
    open({ person: gone, lock: 'closed', items: [msg(false, ago(5), 'Thanks')] }, 'u-closed');
    render(<MessagesScreen />);
    expect(chat().getByRole('status')).toHaveTextContent(
      'Deleted user closed their account. You can still read your past messages.',
    );
    expect(chat().queryByRole('textbox')).toBeNull();
  });
});

describe('the More options menu', () => {
  it('mentee: View profile and Report; on phones, View booking while one is upcoming', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setPhone(true);
    open({ items: [msg(false, ago(5), 'Hi')] });
    render(<MessagesScreen />);
    await user.click(chat().getByRole('button', { name: 'More options' }));
    const items = screen.getAllByRole('menuitem').map(menuName);
    expect(items).toEqual(['View profile', 'View booking', 'Report']);
    await user.click(screen.getByRole('menuitem', { name: 'View booking' }));
    expect(push).toHaveBeenCalledWith('/bookings?tab=upcoming&booking=b-201');
  });

  it('desktop: no View booking (the subline says it); a mentor gets no View profile (Q3)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    h.viewer = MENTOR;
    const gia = person({
      id: 'u-gia',
      name: 'Gia Sajan',
      firstName: 'Gia',
      role: 'mentee',
      handle: null,
    });
    h.chats = inbox([chatRow({ person: gia, nextBooking: menteeRows()[0]!.nextBooking })]);
    open({ person: gia }, 'u-gia');
    render(<MessagesScreen />);
    await user.click(chat().getByRole('button', { name: 'More options' }));
    expect(screen.getAllByRole('menuitem').map(menuName)).toEqual(['Report']);
  });

  it('my side comes from the chat: a mentor account chatting with their own mentor is the mentee there', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    h.viewer = MENTOR;
    h.chats = inbox([chatRow({ last: null })]);
    open({});
    render(<MessagesScreen />);
    expect(chat().getByRole('button', { name: 'Ask what to prepare' })).toBeInTheDocument();
    expect(chat().queryByRole('button', { name: 'Welcome them' })).toBeNull();
    await user.click(chat().getByRole('button', { name: 'More options' }));
    expect(screen.getAllByRole('menuitem').map(menuName)).toEqual(['View profile', 'Report']);
  });

  it('Report is an email to support with the chat, both names and the account', () => {
    const href = reportHref(
      person(),
      { name: 'Amara Okafor', email: 'amara@example.com', mentor: false },
      'https://app.example',
    );
    const url = new URL(href);
    expect(url.protocol).toBe('mailto:');
    expect(url.searchParams.get('subject')).toBe('Messages: Report a chat (Amara Okafor)');
    const body = url.searchParams.get('body')!;
    expect(body).toContain('I want to report my chat with Ujunwa Umeokeke (Mentor).');
    expect(body).toContain('Chat: https://app.example/messages?with=u-ujunwa');
    expect(body).toContain('Account email: amara@example.com');
    expect(body).toContain('Role: Mentee');
  });
});
