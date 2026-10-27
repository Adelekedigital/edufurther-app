import type { components } from '@/lib/api/generated/schema';

/**
 * MOCK of the admin credit reads and grants (Admin PRD A9–A12, backend admin
 * PR 3): the design's sample mentees (Admin.dc.html `users`, ids made
 * UUID-like) with their histories, plus Tunde, ours, for the lines the design
 * doesn't draw (an invite unlock, a no-show refund, a declined request, an
 * expiry). In memory: a grant updates the balance, history and log.
 */
type Schemas = components['schemas'];
type Entry = Schemas['CreditEntryRead'];
type Party = { first_name: string | null; last_name: string | null };

/** Who the mock's grants are by (the design's signed-in admin). */
const ADMIN: Party = { first_name: 'Ada', last_name: 'Okeke' };
const STARTER = 1;
const MONTHLY = 3;

type Mentee = {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  unlocked: boolean;
  /** Newest first. */
  history: Entry[];
};

const party = (full: string): Party => {
  const [first, ...rest] = full.split(' ');
  return { first_name: first ?? null, last_name: rest.join(' ') || null };
};

/** [change, kind, day of October (0 is Sep 30), mentor or admin, refund reason or note]. */
type Seed = [number, Entry['kind'], number, string?, string?];

function seed(
  id: string,
  name: string,
  email: string,
  unlocked: boolean,
  left: number,
  rows: Seed[],
): Mentee {
  const { first_name, last_name } = party(name);
  let after = left;
  const history = rows.map(([change, kind, day, who, extra], i): Entry => {
    const e: Entry = {
      id: `${id.slice(0, 8)}-e${i}`,
      at: new Date(Date.UTC(2026, 9, day, 20 - i)).toISOString(),
      change,
      balance_after: after,
      kind,
      refund_reason:
        kind === 'refund' ? ((extra as Entry['refund_reason']) ?? 'mentor_canceled') : null,
      mentee: { user_id: id, first_name, last_name },
      mentor: who && (kind === 'booking' || kind === 'refund') ? party(who) : null,
      admin: kind === 'admin_grant' ? party(who ?? 'Ada Okeke') : null,
      note: kind === 'admin_grant' ? (extra ?? null) : null,
    };
    after -= change;
    return e;
  });
  return { user_id: id, first_name: first_name!, last_name: last_name!, email, unlocked, history };
}

const initial = (): Mentee[] => [
  seed(
    'a3f2c1d4-2041-4418-9c1e-5b7d4e2f2041',
    'Amara Okafor',
    'amara.okafor@example.com',
    true,
    1,
    [
      [-1, 'booking', 24, 'Ibrahim Adele'],
      [+1, 'refund', 15, 'Natasha Rebel', 'mentor_canceled'],
      [-1, 'booking', 12, 'Natasha Rebel'],
      [-1, 'booking', 6, 'Temitope Oyegoke'],
      [+3, 'monthly_free', 1],
    ],
  ),
  seed(
    'b7e4d2a1-2053-4533-8a2f-1c9d0e3b2053',
    'Chiamaka Eze',
    'chiamaka.eze@example.com',
    false,
    0,
    [
      [-1, 'booking', 21, 'Sakiratu Adeleke'],
      [+1, 'profile_completed', 19],
    ],
  ),
  seed('c1d9e8f7-2011-4112-9b3c-4d5e6f7a2011', 'Kelechi Obi', 'kelechi.obi@example.com', true, 3, [
    [+2, 'admin_grant', 8, 'Kemi Ade', 'Mentor no-show'],
    [-1, 'booking', 3, 'Joshua Lorell'],
    [-1, 'booking', 2, 'Joshua Lorell'],
    [+3, 'monthly_free', 1],
  ]),
  seed(
    'd4c3b2a1-2069-4690-8e7f-6a5b4c3d2069',
    'Funmi Adebayo',
    'funmi.adebayo@example.com',
    false,
    1,
    [[+1, 'profile_completed', 25]],
  ),
  seed('e5f6a7b8-2027-4277-9d8c-7b6a5f4e2027', 'Emeka Nwosu', 'emeka.nwosu@example.com', true, 2, [
    [-1, 'booking', 22, 'Ogunlalu Ademola'],
    [+3, 'monthly_free', 1],
  ]),
  seed('f9e8d7c6-2088-4881-8a9b-0c1d2e3f2088', 'Tunde Bello', 'tunde.bello@example.com', true, 3, [
    [+1, 'refund', 20, 'Joshua Lorell', 'mentor_no_show'],
    [-1, 'booking', 18, 'Joshua Lorell'],
    [+1, 'refund', 14, undefined, 'request_unfulfilled'],
    [-1, 'booking', 12, 'Natasha Rebel'],
    [+3, 'monthly_free', 1],
    [-2, 'expired', 1],
    [+2, 'referral_unlock', 0],
  ]),
];

const store = { mentees: initial(), grants: new Map<string, Schemas['AdminCreditGrantRead']>() };

/** Tests start from the seed. */
export function resetMockCredits() {
  store.mentees = initial();
  store.grants.clear();
}

const nextFirst = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

/** This month's admin grants still held: they expire with the monthly ones (backend). */
function grantedThisMonth(m: Mentee) {
  const month = new Date().toISOString().slice(0, 7);
  return m.history
    .filter((e) => e.kind === 'admin_grant' && e.at.slice(0, 7) === month)
    .reduce((n, e) => n + e.change, 0);
}

function creditsOf(m: Mentee): Schemas['CreditsRead'] {
  const balance = Math.max(0, m.history[0]?.balance_after ?? 0);
  const reset = nextFirst();
  const bonus = m.unlocked ? Math.min(balance, grantedThisMonth(m)) : balance;
  const monthly = balance - bonus;
  return {
    balance,
    allowance: Math.max(m.unlocked ? MONTHLY : STARTER, balance),
    state:
      balance === 0 ? 'exhausted' : balance === 1 ? 'low' : balance === 2 ? 'moderate' : 'on_track',
    next_reset_at: reset,
    monthly: {
      balance: monthly,
      ceiling: MONTHLY,
      expires_at: monthly ? reset : null,
      unlocked: m.unlocked,
    },
    bonus: {
      balance: bonus,
      groups: bonus ? [{ count: bonus, expires_at: m.unlocked ? reset : null }] : [],
    },
  };
}

function toRead(m: Mentee): Schemas['AdminMenteeRead'] {
  return {
    user_id: m.user_id,
    first_name: m.first_name,
    last_name: m.last_name,
    email: m.email,
    avatar_url: null,
    cover_color: null,
    credits: creditsOf(m),
  };
}

const byName = (a: Mentee, b: Mentee) =>
  `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);

/** Email or name substring (any case) or the exact id; empty: the 10 latest movers. */
export function searchMentees(q: string): Schemas['AdminMenteeRead'][] {
  const t = q.trim().toLowerCase();
  if (!t) {
    return [...store.mentees]
      .sort((a, b) => (b.history[0]?.at ?? '').localeCompare(a.history[0]?.at ?? ''))
      .slice(0, 10)
      .map(toRead);
  }
  return store.mentees
    .filter(
      (m) =>
        m.user_id === t ||
        m.email.toLowerCase().includes(t) ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(t),
    )
    .sort(byName)
    .slice(0, 20)
    .map(toRead);
}

const PAGE = 50;
const page = (all: Entry[], cursor: string | null) => {
  const from = cursor ? Number(cursor) : 0;
  const data = all.slice(from, from + PAGE);
  return { data, next_cursor: from + PAGE < all.length ? String(from + PAGE) : null };
};

export function menteeCredits(id: string): Schemas['AdminMenteeCreditsRead'] | null {
  const m = store.mentees.find((x) => x.user_id === id);
  if (!m) return null;
  const { data, next_cursor } = page(m.history, null);
  return { mentee: toRead(m), history: data, history_next_cursor: next_cursor };
}

const TYPES: Record<string, Entry['kind'][]> = {
  admin: ['admin_grant'],
  bookings: ['booking'],
  refunds: ['refund'],
  monthly: ['monthly_free', 'profile_completed', 'referral_unlock', 'opening_balance'],
};

/** A bad cursor or type is the API's 422. */
export function creditLog(
  type: string | null,
  cursor: string | null,
  menteeId: string | null,
): { data: Entry[]; next_cursor: string | null } | null {
  const kinds = !type || type === 'all' ? null : TYPES[type];
  if (kinds === undefined || (cursor !== null && !/^\d+$/.test(cursor))) return null;
  const all = store.mentees
    .filter((m) => !menteeId || m.user_id === menteeId)
    .flatMap((m) => m.history)
    .filter((e) => !kinds || kinds.includes(e.kind))
    .sort((a, b) => b.at.localeCompare(a.at));
  return page(all, cursor);
}

export const creditRules = (): Schemas['CreditRulesRead'] => ({
  starter: STARTER,
  monthly: MONTHLY,
});

/**
 * `POST /admin/credits`: 1 to the monthly allowance, else 422. A repeated
 * Idempotency-Key answers what it answered the first time, crediting nobody again.
 */
export function grantCredits(
  key: string,
  body: Schemas['AdminCreditGrantWrite'],
): Schemas['AdminCreditGrantRead'] | null {
  const seen = store.grants.get(key);
  if (seen) return seen;
  const q = body.quantity;
  if (!Number.isInteger(q) || q < 1 || q > MONTHLY || !Array.isArray(body.user_ids)) return null;
  const granted: string[] = [];
  const unresolved: string[] = [];
  for (const id of new Set(body.user_ids)) {
    const m = store.mentees.find((x) => x.user_id === id);
    if (!m) {
      unresolved.push(id);
      continue;
    }
    m.history.unshift({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      change: q,
      balance_after: (m.history[0]?.balance_after ?? 0) + q,
      kind: 'admin_grant',
      refund_reason: null,
      mentee: { user_id: m.user_id, first_name: m.first_name, last_name: m.last_name },
      mentor: null,
      admin: ADMIN,
      note: body.note?.trim() || null,
    });
    granted.push(id);
  }
  const res = { granted, unresolved, quantity: q };
  store.grants.set(key, res);
  return res;
}
