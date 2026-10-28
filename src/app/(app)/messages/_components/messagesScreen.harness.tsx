/**
 * Shared test harness for the Messages screen's tests: the mocked hooks and the
 * per-test state they read. Each test file registers the mocks itself
 * (`vi.mock(path, async () => (await import(harness)).mocks.x())`), as the
 * Bookings harness does. `resetHarness` in `beforeEach` puts it all back.
 */
import { accessFor } from '@/lib/utils/access';
import type { ChatPerson, ChatRow } from '@/types/messages';
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
  /** `useChats` was asked to fetch. */
  chatsActive: false,
};

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
  h.chatsActive = false;
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
      return h.chats;
    },
    useMessagePeople: (q: string) => {
      h.peopleQuery = q;
      return h.people;
    },
    useMessageSettings: () => h.settings,
    useSaveMessageSettings: () => ({
      mutate: (next: { unreadEmails: boolean }) => {
        saveSettings(next);
        if (!h.saveFailed) h.settings = remote(next);
      },
      get isError() {
        return h.saveFailed;
      },
    }),
  }),
};
