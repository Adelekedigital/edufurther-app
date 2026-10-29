/**
 * Shared test harness for the Messages screen's tests: the mocked hooks and the
 * per-test state they read. Each test file registers the mocks itself
 * (`vi.mock(path, async () => (await import(harness)).mocks.x())`), as the
 * Bookings harness does. `resetHarness` in `beforeEach` puts it all back.
 */
import type { components } from '@/lib/api/generated/schema';
import { accessFor } from '@/lib/utils/access';
import type { ChatPerson, ChatRow, OutboxItem, Thread } from '@/types/messages';
import type { Remote, Viewer } from '@/types/mentor';

export const remote = <T,>(data: T | null, over: Partial<Remote<T>> = {}): Remote<T> => ({
  data,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

export const NOW = new Date('2026-10-27T12:00:00Z');
export const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();
export const ahead = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

export const person = (over: Partial<ChatPerson> = {}): ChatPerson => ({
  id: 'u-ujunwa',
  name: 'Ujunwa Umeokeke',
  firstName: 'Ujunwa',
  initials: 'UU',
  avatarUrl: null,
  avatarFocus: null,
  cover: 'sky',
  role: 'mentor',
  institution: 'Central European University',
  handle: 'ujunwa-umeokeke',
  state: 'active',
  ...over,
});

export const chatRow = (over: Partial<ChatRow> = {}): ChatRow => ({
  person: person(),
  last: {
    kind: 'text',
    text: 'See you Tuesday.',
    fileName: null,
    mine: false,
    at: ago(40),
    deleted: false,
  },
  unread: 0,
  nextBooking: null,
  ...over,
});

/** A mentee's inbox: one unread, one with a booking, one fresh. */
export const menteeRows = (): ChatRow[] => [
  chatRow({
    unread: 2,
    nextBooking: { id: 'b-201', startsAt: ahead(29), sessionName: 'SOP review' },
  }),
  chatRow({
    person: person({
      id: 'u-hugh',
      name: 'Hugh Momah',
      firstName: 'Hugh',
      initials: 'HM',
      institution: 'University of Portsmouth',
      handle: 'hugh-momah',
    }),
    last: {
      kind: 'file',
      text: null,
      fileName: 'CV.pdf',
      mine: true,
      at: ago(60 * 26),
      deleted: false,
    },
  }),
  chatRow({
    person: person({
      id: 'u-gbenga',
      name: 'Gbenga Elufisan',
      firstName: 'Gbenga',
      initials: 'GE',
      institution: 'University of Toronto',
      handle: 'gbenga-elufisan',
    }),
    last: null,
    nextBooking: { id: 'b-203', startsAt: ahead(72), sessionName: null },
  }),
];

export const MENTEE: Extract<Viewer, { kind: 'member' }> = {
  kind: 'member',
  id: 'me',
  firstName: 'Amara',
  initials: 'AO',
  isMentee: true,
  isApprovedMentor: false,
  isMentor: false,
  completedSessions: 1,
  credits: null,
  timeZone: 'Africa/Lagos',
  onboardingComplete: true,
};

export const MENTOR: Extract<Viewer, { kind: 'member' }> = {
  ...MENTEE,
  firstName: 'Ujunwa',
  isMentee: false,
  isApprovedMentor: true,
  isMentor: true,
  mentorStage: 'approved',
  mentorApprovedSeen: true,
};

export const replace = vi.fn();
export const push = vi.fn();
export const saveSettings = vi.fn();

/** Everything a test varies. Read lazily by the mocks, so assignment is enough. */
export const h = {
  viewer: MENTEE as Viewer,
  search: '',
  chats: remote<{ rows: ChatRow[]; totalUnread: number }>(null),
  people: remote<ChatPerson[]>(null),
  /** What New message last searched for. */
  peopleQuery: null as string | null,
  settings: remote<{ unreadEmails: boolean }>({ unreadEmails: true }),
  saveFailed: false,
  /** A flip is still saving (the mutation's `isPending`). */
  saving: false,
  /** `useChats` was asked to fetch. */
  chatsActive: false,
  /** `useChats` has a read in flight. */
  refreshing: false,
  /** The open chat's read (`useThread`), by person id; absent: still loading. */
  threads: {} as Record<string, Remote<Thread>>,
  /** `useThread` was asked for these ids. */
  threadAsked: [] as (string | null)[],
  outbox: [] as OutboxItem[],
  /** The mentee's goal as `useMenteeGoals` reads it. */
  goal: null as null | {
    degree_goal: { code: string } | null;
    degree_goal_raw: string | null;
    field_of_study: string | null;
    target_start_term: string | null;
    needs: Pick<components['schemas']['LookupRef'], 'code' | 'display_name'>[];
  },
};

export const sent = vi.fn();
export const retried = vi.fn();
export const markRead = vi.fn();
export const loadOlder = vi.fn();

export const thread = (over: Partial<Thread> = {}): Thread => ({
  person: person(),
  lock: null,
  nextBooking: null,
  sessionWindow: false,
  items: [],
  theirLastReadAt: null,
  myLastReadAt: null,
  hasMore: false,
  cursor: null,
  ...over,
});

export function inbox(rows: ChatRow[]) {
  return remote({ rows, totalUnread: rows.reduce((n, r) => n + r.unread, 0) });
}

export function resetHarness() {
  h.viewer = MENTEE;
  h.search = '';
  h.chats = inbox(menteeRows());
  h.people = remote([]);
  h.peopleQuery = null;
  h.settings = remote({ unreadEmails: true });
  h.saveFailed = false;
  h.saving = false;
  h.chatsActive = false;
  h.refreshing = false;
  h.threads = {};
  h.threadAsked = [];
  h.outbox = [];
  h.goal = null;
  sent.mockReset();
  retried.mockReset();
  retried.mockResolvedValue(true);
  markRead.mockReset();
  loadOlder.mockReset();
  replace.mockReset();
  push.mockReset();
  saveSettings.mockReset();
  setPhone(false);
}

/** Answers `useMediaQuery('(max-width: 767px)')` as a phone (or not). */
export function setPhone(phone: boolean) {
  window.matchMedia = (query: string) =>
    ({
      media: query,
      matches: phone && query.includes('max-width'),
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

export const mocks = {
  navigation: () => ({
    usePathname: () => '/messages',
    useRouter: () => ({ replace, push }),
    useSearchParams: () => new URLSearchParams(h.search),
  }),
  appShell: () => ({
    useAppShell: () => ({
      access: accessFor(h.viewer),
      viewer: h.viewer,
      member: h.viewer.kind === 'member' ? h.viewer : null,
    }),
  }),
  messages: () => ({
    useChats: (active: boolean) => {
      h.chatsActive = active;
      return { ...h.chats, refreshing: h.refreshing };
    },
    useMessagePeople: (q: string) => {
      h.peopleQuery = q;
      return h.people;
    },
    useMessageSettings: () => h.settings,
    useThread: (id: string | null) => {
      h.threadAsked.push(id);
      return { ...(h.threads[id ?? ''] ?? remote<Thread>(null, { isLoading: true })), loadOlder };
    },
    useMarkRead: () => ({ mutate: markRead }),
    useSaveMessageSettings: () => ({
      mutate: (next: { unreadEmails: boolean }) => {
        saveSettings(next);
        if (!h.saveFailed) h.settings = remote(next);
      },
      get isError() {
        return h.saveFailed;
      },
      get isPending() {
        return h.saving;
      },
    }),
  }),
};

/** The chat's other reads and writes: the outbox, the viewer's goal and /me. */
export const chatMocks = {
  messageSend: () => ({
    useOutbox: (to: string | null) => h.outbox.filter((o) => o.to === to),
    useSendMessage: () => ({ send: sent, retry: retried }),
  }),
  goals: () => ({
    useMenteeGoals: (id: string | null) => ({
      read: id ? { goal: h.goal, originCode: null, currentCode: null } : null,
      status: 'ready',
      retry: vi.fn(),
      retrying: false,
    }),
  }),
  settings: () => ({
    useMenteeProfile: () => ({
      profile: { name: 'Amara Okafor', email: 'amara@example.com' },
      status: 'ready',
      retry: vi.fn(),
      retrying: false,
    }),
  }),
};
