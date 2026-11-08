import type { components } from '@/lib/api/generated/schema';

/**
 * MOCK of Preview as user (backend PRs 1 and 3, contract of 7 Nov): the
 * previewable accounts and the sessions, in memory, for local dev and CI page
 * review only (ENABLE_MOCK_API=1). The names are the design's (AppShell.dc.html
 * `_vaList`), padded to more than a page so "more on scroll" can be seen.
 */
type Row = components['schemas']['AdminUserRead'];
type Session = components['schemas']['PreviewSessionRead'];

const NAMED: [string, string, string, Row['role']][] = [
  ['Amara', 'Okafor', 'amara.okafor@gmail.com', 'mentee'],
  ['Tunde', 'Bakare', 'tunde.bakare@gmail.com', 'mentor'],
  ['Chiamaka', 'Eze', 'chiamaka.eze@yahoo.com', 'mentee'],
  ['Ifeoma', 'Nwosu', 'ifeoma.nwosu@gmail.com', 'mentor'],
  ['Kelechi', 'Obi', 'kelechi.obi@outlook.com', 'mentee'],
  ['Zainab', 'Bello', 'zainab.bello@gmail.com', 'mentor'],
];

const USERS: Row[] = [
  ...NAMED.map(([first, last, email, role], i) => ({
    user_id: `00000000-0000-4000-8000-0000000000${String(i + 10)}`,
    email,
    first_name: first,
    last_name: last,
    role,
  })),
  // No name on the account: the picker falls back to the email.
  {
    user_id: '00000000-0000-4000-8000-000000000099',
    email: 'no.name.yet@example.com',
    first_name: null,
    last_name: null,
    role: 'mentee',
  },
  ...Array.from({ length: 24 }, (_, i): Row => ({
    user_id: `00000000-0000-4000-8000-0000000001${String(i + 10)}`,
    email: `test.user${i + 1}@example.com`,
    first_name: 'Test',
    last_name: `User ${i + 1}`,
    role: i % 3 === 0 ? 'mentor' : 'mentee',
  })),
];

const PAGE = 20;

/** GET /admin/users: contains on email and names, by role, 20 a page. */
export function searchPreviewUsers(q: string, role: string, cursor: string | null) {
  const needle = q.trim().toLowerCase();
  const hits = USERS.filter((u) => role === 'all' || !role || u.role === role).filter((u) => {
    if (!needle) return true;
    const full = `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase();
    return u.email.toLowerCase().includes(needle) || full.includes(needle);
  });
  const start = cursor ? Number(cursor) || 0 : 0;
  const data = hits.slice(start, start + PAGE);
  const next = start + PAGE < hits.length ? String(start + PAGE) : null;
  return { data, next_cursor: next };
}

const sessions = new Map<string, Session>();
let seq = 0;

function find(by: { user_id?: string; email?: string }): Row | undefined {
  return USERS.find(
    (u) => u.user_id === by.user_id || (!!by.email && u.email === by.email.trim().toLowerCase()),
  );
}

/** POST /admin/preview-sessions: undefined when nobody previewable matches (a 404). */
export function startPreview(by: { user_id?: string; email?: string }): Session | undefined {
  const user = find(by);
  if (!user) return undefined;
  const now = new Date();
  seq += 1;
  const s: Session = {
    id: `00000000-0000-4000-9000-${String(seq).padStart(12, '0')}`,
    user,
    started_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 2 * 3600_000).toISOString(),
    ended_at: null,
    end_reason: null,
    revealed: false,
    can_reveal: true,
  };
  sessions.set(s.id, s);
  return s;
}

export function getPreview(id: string): Session | undefined {
  return sessions.get(id);
}

/** PATCH /{id}: a new user, reveals reset. */
/** PATCH /{id}: 'ended' is the backend's 409 (the session ended meanwhile); undefined a 404. */
export function switchPreview(id: string, userId: string): Session | 'ended' | undefined {
  const s = sessions.get(id);
  const user = find({ user_id: userId });
  if (s?.ended_at) return 'ended';
  if (!s || !user) return undefined;
  const next = { ...s, user, revealed: false };
  sessions.set(id, next);
  return next;
}

export function endPreview(id: string, reason: 'exit' | 'sign_out'): boolean {
  const s = sessions.get(id);
  if (!s) return false;
  sessions.set(id, { ...s, ended_at: new Date().toISOString(), end_reason: reason });
  return true;
}

/** The live session this request previews (its X-EF-Preview header), if any. */
export function previewOf(req: Request): Session | undefined {
  const id = req.headers.get('x-ef-preview');
  const s = id ? sessions.get(id) : undefined;
  return s && !s.ended_at ? s : undefined;
}

/** POST /{id}/reveals: the current user's messages show for the rest of the session. */
export function revealPreview(id: string): Session | undefined {
  const s = sessions.get(id);
  if (!s || s.ended_at || !s.can_reveal) return undefined;
  const next = { ...s, revealed: true };
  sessions.set(id, next);
  return next;
}

type Masked = { hidden_in_preview?: boolean };
type WireMessage = Masked & { body?: string | null; file?: unknown };
type WireLast = Masked & { text?: string | null; file_name?: string | null };

/** Backend PR 5's masking, for the mock: bodies and files out until a reveal. */
export function maskMessages<T extends WireMessage>(req: Request, items: T[]): T[] {
  const s = previewOf(req);
  if (!s || s.revealed) return items;
  return items.map((m) => ({ ...m, body: null, file: null, hidden_in_preview: true }));
}

export function maskLast<T extends WireLast>(req: Request, last: T | null | undefined) {
  const s = previewOf(req);
  if (!last || !s || s.revealed) return last;
  return { ...last, text: null, file_name: null, hidden_in_preview: true };
}
