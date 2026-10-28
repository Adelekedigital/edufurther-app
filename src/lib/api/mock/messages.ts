import type {
  WireChatPerson,
  WireChatRow,
  WireChats,
  WireMessage,
  WireMessageFile,
  WireThread,
} from '@/lib/api/data/pending';

/**
 * MOCK of Messages (PRD Messages; contract in docs/handoff/messages-backend-reply.md).
 * One in-memory store per mock role. The page's `?mockViewer=` (via Referer)
 * picks the role; `?mockMessages=empty` gives the empty inbox. A sent message
 * reads as read by the other person 10 seconds later, so ticks can be seen turning blue.
 */

type Role = 'mentee' | 'mentor';

type Chat = {
  person: WireChatPerson;
  msgs: WireMessage[];
  myLastRead: string | null;
  theirLastRead: string | null;
  next: { id: string; starts_at: string; session_name: string | null } | null;
  /** Booking order for people with no messages (newest first). */
  bookedAt: string;
};

const MIN = 60_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

function person(
  id: string,
  first: string,
  last: string,
  role: Role,
  institution: string | null,
  extra: Partial<WireChatPerson> = {},
): WireChatPerson {
  return {
    id,
    deleted: false,
    first_name: first,
    last_name: last,
    avatar_url: null,
    avatar_focus: null,
    cover_color: null,
    degree: null,
    institution,
    role,
    handle: role === 'mentor' ? `${first}-${last}`.toLowerCase() : null,
    paused: false,
    ...extra,
  };
}

let seq = 0;
function msg(
  mine: boolean,
  at: string,
  body: string | null,
  extra: Partial<WireMessage> = {},
): WireMessage {
  seq += 1;
  return {
    id: `m-${String(seq).padStart(4, '0')}`,
    client_id: null,
    sender_id: mine ? 'me' : 'them',
    mine,
    body,
    file: null,
    sent_at: at,
    edited_at: null,
    deleted: false,
    ...extra,
  };
}

/** Every file the mock knows (seeded or uploaded), for `GET /message-files/{id}`. */
const known = new Map<string, WireMessageFile>();

const pdf = (name: string, size: number): WireMessageFile => {
  const f = { id: `f-${name}`, filename: name, size, content_type: 'application/pdf' };
  known.set(f.id, f);
  return f;
};

/** A message file's type, or null for one the mock never saw (a 404). */
export function mockMessageFileType(id: string): string | null {
  return known.get(id)?.content_type ?? null;
}

function seedMentee(): Chat[] {
  const D = 24 * 60 * MIN;
  return [
    {
      person: person('u-ujunwa', 'Ujunwa', 'Umeokeke', 'mentor', 'Central European University'),
      next: {
        id: 'b-201',
        starts_at: ahead(D + 5 * 60 * MIN),
        session_name: 'Statement of purpose review',
      },
      bookedAt: ago(5 * D),
      myLastRead: ago(30 * MIN),
      theirLastRead: ago(D),
      msgs: [
        msg(
          true,
          ago(5 * D),
          'Hi Ujunwa, I just booked a session for Tuesday. I’d love to go through my statement of purpose.',
        ),
        msg(true, ago(5 * D - 2 * MIN), null, { file: pdf('Amara_Okafor_SOP_draft.pdf', 240_000) }),
        msg(
          false,
          ago(5 * D - 27 * MIN),
          'Thanks Amara, got it. I’ll read it before we meet. Could you also send the program page?',
          { edited_at: ago(5 * D - 25 * MIN) },
        ),
        msg(true, ago(5 * D - 29 * MIN), 'Here it is: ceu.edu/public-policy'),
        msg(
          false,
          ago(40 * MIN),
          'Read your draft. Strong opening. Let’s spend most of Tuesday on the second half.',
        ),
      ],
    },
    {
      person: person('u-hugh', 'Hugh', 'Momah', 'mentor', 'University of Portsmouth'),
      next: null,
      bookedAt: ago(8 * D),
      myLastRead: ago(D - 60 * MIN),
      theirLastRead: ago(D - 60 * MIN),
      msgs: [
        msg(true, ago(D), 'Thanks for today, Hugh. Which scholarship should I start with?'),
        msg(false, ago(90 * MIN), 'Yes, I do. Chevening is the one I know best.'),
        msg(
          false,
          ago(89 * MIN),
          'Start your reference list this week. We can go through it next time.',
        ),
      ],
    },
    {
      person: person('u-muhammad', 'Muhammad Kabir', 'Musa', 'mentor', 'Nazarbayev University'),
      next: { id: 'b-202', starts_at: ahead(6 * D), session_name: 'Interview practice' },
      bookedAt: ago(10 * D),
      myLastRead: ago(D),
      theirLastRead: ago(D),
      msgs: [
        msg(
          false,
          ago(9 * D),
          'Sorry for the change. Monday works better so we have the full hour.',
        ),
        msg(true, ago(9 * D - 20 * MIN), 'Thank you, see you then!'),
        msg(false, ago(9 * D - 25 * MIN), null, { deleted: true }),
      ],
    },
    {
      person: person('u-gbenga', 'Gbenga', 'Elufisan', 'mentor', 'University of Toronto'),
      next: { id: 'b-203', starts_at: ahead(3 * D), session_name: 'School selection' },
      bookedAt: ago(60 * MIN),
      myLastRead: null,
      theirLastRead: null,
      msgs: [],
    },
    {
      person: person('u-kemi', 'Kemi', 'Adebayo', 'mentor', 'University of Edinburgh', {
        paused: true,
      }),
      next: null,
      bookedAt: ago(20 * D),
      myLastRead: ago(14 * D),
      theirLastRead: ago(14 * D),
      msgs: [msg(false, ago(14 * D), 'Good luck with the interview!')],
    },
  ];
}

function seedMentor(): Chat[] {
  const D = 24 * 60 * MIN;
  return [
    {
      person: person(
        'u-maxwell',
        'Maxwell',
        'Amponsah',
        'mentee',
        'Kwame Nkrumah University of Science and Technology',
      ),
      next: { id: 'b-301', starts_at: ahead(4 * D), session_name: 'CV review' },
      bookedAt: ago(2 * D),
      myLastRead: ago(30 * MIN),
      theirLastRead: ago(D),
      msgs: [
        msg(
          false,
          ago(2 * D),
          'Hi Ujunwa, I just booked a session with you for Friday at 5:00 PM.',
        ),
        msg(false, ago(2 * D - 2 * MIN), null, { file: pdf('Maxwell_Amponsah_CV.pdf', 180_000) }),
        msg(
          true,
          ago(2 * D - 19 * MIN),
          'Thanks Maxwell, got your CV. I’ll go through it before Friday.',
        ),
        msg(false, ago(45 * MIN), 'Great, thank you! Should I bring anything else?'),
      ],
    },
    {
      person: person('u-gia', 'Gia', 'Sajan', 'mentee', 'Strathmore University'),
      next: null,
      bookedAt: ago(9 * D),
      myLastRead: ago(D),
      theirLastRead: null,
      msgs: [
        msg(
          false,
          ago(80 * MIN),
          'Hi Ujunwa, I tried to book but couldn’t find an open time this week. Do you have anything next week?',
        ),
      ],
    },
    {
      person: person('u-chiamaka', 'Chiamaka', 'Eze', 'mentee', 'University of Ibadan'),
      next: { id: 'b-302', starts_at: ahead(5 * D), session_name: 'School selection' },
      bookedAt: ago(30 * MIN),
      myLastRead: null,
      theirLastRead: null,
      msgs: [],
    },
    {
      person: {
        ...person('u-closed', '', '', 'mentee', null),
        deleted: true,
        first_name: null,
        last_name: null,
      },
      next: null,
      bookedAt: ago(30 * D),
      myLastRead: ago(25 * D),
      theirLastRead: ago(25 * D),
      msgs: [msg(false, ago(26 * D), 'Thank you for the session!')],
    },
  ];
}

const stores = new Map<Role, Chat[]>();
const settings = new Map<Role, boolean>();

function store(role: Role): Chat[] {
  let s = stores.get(role);
  if (!s) {
    s = role === 'mentor' ? seedMentor() : seedMentee();
    stores.set(role, s);
  }
  return s;
}

/** The mock role and inbox from the page's URL (Referer), else the env default. */
export function mockMessagesContext(req: Request): { role: Role; empty: boolean } {
  let viewer: string | null = null;
  let empty = false;
  try {
    const referer = req.headers.get('referer');
    if (referer) {
      const sp = new URL(referer).searchParams;
      viewer = sp.get('mockViewer');
      empty = sp.get('mockMessages') === 'empty';
    }
  } catch {}
  const role = (viewer ?? process.env.NEXT_PUBLIC_MOCK_VIEWER) === 'mentor' ? 'mentor' : 'mentee';
  return { role, empty };
}

/** Their read mark, with the mock's "read 10 seconds later" for active people. */
function theirRead(c: Chat): string | null {
  if (c.person.deleted || c.person.paused) return c.theirLastRead;
  const mine = c.msgs.filter((m) => m.mine && Date.now() - Date.parse(m.sent_at) > 10_000).at(-1);
  if (!mine) return c.theirLastRead;
  return !c.theirLastRead || mine.sent_at > c.theirLastRead ? mine.sent_at : c.theirLastRead;
}

function unreadOf(c: Chat): number {
  return c.msgs.filter((m) => !m.mine && !m.deleted && (!c.myLastRead || m.sent_at > c.myLastRead))
    .length;
}

function row(c: Chat): WireChatRow {
  const last = c.msgs.at(-1);
  return {
    person: c.person,
    unread: unreadOf(c),
    next_booking: c.next,
    last: last
      ? {
          kind: last.file && !last.body ? 'file' : 'text',
          text: last.deleted ? null : (last.body?.slice(0, 140) ?? null),
          file_name: last.deleted ? null : (last.file?.filename ?? null),
          mine: last.mine,
          at: last.sent_at,
          deleted: last.deleted,
        }
      : null,
  };
}

export function mockChats(role: Role, empty: boolean): WireChats {
  if (empty) return { data: [], next_cursor: null, total_unread: 0 };
  const chats = [...store(role)].sort((a, b) => {
    const la = a.msgs.at(-1)?.sent_at;
    const lb = b.msgs.at(-1)?.sent_at;
    if (la && lb) return lb.localeCompare(la);
    if (la) return -1;
    if (lb) return 1;
    return b.bookedAt.localeCompare(a.bookedAt);
  });
  const data = chats.map(row);
  return { data, next_cursor: null, total_unread: data.reduce((n, r) => n + r.unread, 0) };
}

export function mockUnread(role: Role, empty: boolean): number {
  return mockChats(role, empty).total_unread;
}

export function mockPeople(role: Role, q: string): WireChatPerson[] {
  const n = q.trim().toLowerCase();
  return store(role)
    .map((c) => c.person)
    .filter((p) => !p.deleted)
    .filter((p) => !n || `${p.first_name} ${p.last_name}`.toLowerCase().includes(n));
}

/**
 * The ids the mock may start a chat with: the sessions mock's booking parties
 * (`mock-…`) and the mentor fixtures (`m-…`). Anyone else stays unconnected,
 * so the inbox's gone (404) and not-connected (403) states still show.
 */
const startable = (id: string) => id.startsWith('mock-') || id.startsWith('m-');

function startChat(role: Role, id: string): Chat {
  const c: Chat = {
    person: person(id, 'Booked', 'Person', role === 'mentor' ? 'mentee' : 'mentor', null),
    msgs: [],
    myLastRead: null,
    theirLastRead: null,
    next: null,
    bookedAt: new Date().toISOString(),
  };
  store(role).push(c);
  return c;
}

function find(role: Role, id: string): Chat | undefined {
  return store(role).find((c) => c.person.id === id);
}

export function mockThread(
  role: Role,
  id: string,
  q: { before: string | null; after: string | null; limit: number },
): WireThread | 'notFound' | 'badRequest' {
  if (q.before && q.after) return 'badRequest';
  // SendMessage's status read (`limit=0`) is for a booking party or a profile
  // mentor the mock never seeded: answer as a connected pair with no messages
  // yet, as the real API does. A chat read for an unknown id stays a 404.
  const c = find(role, id) ?? (q.limit === 0 && startable(id) ? startChat(role, id) : undefined);
  if (!c) return 'notFound';
  let items = c.msgs;
  let hasMore = false;
  if (q.after) {
    const i = items.findIndex((m) => m.id === q.after);
    items = i < 0 ? items : items.slice(i + 1);
    hasMore = items.length > q.limit;
    items = items.slice(0, q.limit);
  } else {
    if (q.before) {
      const i = items.findIndex((m) => m.id === q.before);
      items = i < 0 ? [] : items.slice(0, i);
    }
    hasMore = q.limit === 0 ? c.msgs.length > 0 : items.length > q.limit;
    items = q.limit === 0 ? [] : items.slice(-q.limit);
  }
  const startsAt = c.next ? Date.parse(c.next.starts_at) : NaN;
  return {
    person: c.person,
    lock: c.person.deleted ? 'closed' : c.person.paused ? 'paused' : null,
    next_booking: c.next,
    session_window: Number.isFinite(startsAt) && Math.abs(startsAt - Date.now()) <= 15 * MIN,
    items,
    their_last_read_at: theirRead(c),
    my_last_read_at: c.myLastRead,
    has_more: hasMore,
  };
}

export type MockSend =
  { ok: WireMessage; created: boolean } | { status: 403 | 409 | 422; type?: string };

export function mockSend(
  role: Role,
  id: string,
  body: { client_id?: string; body?: string; file_id?: string },
): MockSend {
  // The real API creates the conversation on the first send. The mock's
  // booking parties and profile mentors aren't seeded chats, so a Message
  // button there starts one, as for a connected pair (`startable`).
  const c = find(role, id) ?? (startable(id) ? startChat(role, id) : undefined);
  if (!c) return { status: 403, type: '/problems/not-connected' };
  if (c.person.deleted) return { status: 409, type: '/problems/recipient-closed' };
  if (c.person.paused) return { status: 409, type: '/problems/recipient-paused' };
  const text = body.body?.trim() ?? '';
  if ((!text && !body.file_id) || text.length > 2000 || !body.client_id) return { status: 422 };
  const again = c.msgs.find((m) => m.mine && m.client_id === body.client_id);
  if (again) return { ok: again, created: false };
  const file = body.file_id ? uploads.get(body.file_id) : undefined;
  if (body.file_id && !file) return { status: 422, type: '/problems/file-unavailable' };
  const m = msg(true, new Date().toISOString(), text || null, {
    client_id: body.client_id,
    file: file ?? null,
  });
  c.msgs.push(m);
  if (file) uploads.delete(file.id);
  return { ok: m, created: true };
}

export function mockRead(role: Role, id: string, upTo: string): 'ok' | 'notFound' | 'badRequest' {
  const c = find(role, id);
  if (!c) return 'notFound';
  const m = c.msgs.find((x) => x.id === upTo);
  if (!m) return 'badRequest';
  if (!c.myLastRead || m.sent_at > c.myLastRead) c.myLastRead = m.sent_at;
  return 'ok';
}

export function mockSettings(role: Role, next?: boolean): { unread_emails: boolean } {
  if (next !== undefined) settings.set(role, next);
  return { unread_emails: settings.get(role) ?? true };
}

/** Uploaded and not yet sent (PR 2's `/me/message-files`). */
const uploads = new Map<string, WireMessageFile>();

export function mockUpload(name: string, size: number, type: string): WireMessageFile | string {
  if (size > 5 * 1024 * 1024) return '/problems/file-too-large';
  const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const lower = name.toLowerCase();
  const contentType = lower.endsWith('.pdf')
    ? 'application/pdf'
    : lower.endsWith('.docx')
      ? docx
      : null;
  if (!contentType || (type && type !== contentType)) return '/problems/file-type-not-allowed';
  seq += 1;
  const f = { id: `f-up-${seq}`, filename: name, size, content_type: contentType };
  uploads.set(f.id, f);
  known.set(f.id, f);
  return f;
}
