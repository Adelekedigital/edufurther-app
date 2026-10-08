import { NextResponse } from 'next/server';

const DAY = 24 * 60 * 60 * 1000;
/**
 * The instant j-1 and j-2 are timed from: fixed when the server starts, so
 * polls see one session moving through its phases rather than a start that
 * moves away on every read. Restart the dev server to reset them.
 */
const CLOCK_ANCHOR = (() => {
  const d = new Date();
  d.setUTCSeconds(0, 0);
  return d.toISOString();
})();
const party = (id: string, first: string, last: string | null = null, zone = 'Africa/Lagos') => ({
  id,
  deleted: false,
  first_name: first,
  last_name: last,
  avatar_url: null,
  avatar_focus: null,
  timezone: zone,
  joined_at: null,
  attendance_status: 'pending',
});

/**
 * MOCK of GET /api/v1/users/{id}/sessions — enough rows for Bookings' three
 * tabs and for Calendar's month dots. Supports `from`/`to`, repeatable
 * `status` (backend #326) and `order` (#336). ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 150));
  const at = (days: number, hourUtc: number, minutes = 0) => {
    const d = new Date(Date.now() + days * DAY);
    d.setUTCHours(hourUtc, minutes, 0, 0);
    return d.toISOString();
  };
  const minutesFrom = (iso: string, m: number) =>
    new Date(Date.parse(iso) + m * 60_000).toISOString();

  type Opts = {
    topic?: string | null;
    message?: string | null;
    respondBy?: string | null;
    asMentee?: boolean;
    rate?: number | null;
    answers?: { count: number; first: { question_text: string; text: string } } | null;
    suggestion?: 'active' | 'booked' | 'expired';
    typeId?: string;
    /** The other party's zone, so the "what time is it for them" line has something to say. */
    zone?: string;
    /** The offering's name, for the join page's title. */
    typeName?: string;
    duration?: number;
    /** When the other party pressed Join (the join page's "Here now"). */
    otherJoinedAt?: string;
    /** When the viewer pressed Join (the join page's Rejoin). */
    meJoinedAt?: string;
  };
  const session = (
    id: string,
    starts: string,
    status: string,
    mentee: [string, string],
    o: Opts = {},
  ) => {
    const other = {
      ...party(`mock-${id}`, mentee[0], mentee[1], o.zone ?? 'Africa/Lagos'),
      joined_at: o.otherJoinedAt ?? null,
    };
    const me = {
      ...party(userId, 'Gbenga', 'Adeyemi', 'America/New_York'),
      joined_at: o.meJoinedAt ?? null,
    };
    return {
      id,
      // `asMentee`: the viewer booked this one, so they are the mentee on it.
      mentor_id: o.asMentee ? other.id : userId,
      mentee_id: o.asMentee ? userId : other.id,
      mentor: o.asMentee ? other : me,
      mentee: o.asMentee ? me : other,
      // A real offering, so the mentor's suggest picker can ask for its slots.
      session_type_id: o.typeId ?? 'st-general',
      session_type: o.typeName ? { id: o.typeId ?? 'st-general', name: o.typeName } : null,
      status,
      starts_at: starts,
      duration_minutes: o.duration ?? 60,
      topic: o.topic === undefined ? null : o.topic,
      booking_message: o.message ?? null,
      meeting_provider: 'daily',
      meeting_url: null,
      respond_by: o.respondBy === undefined ? null : o.respondBy,
      join_opens_at: status === 'confirmed' ? minutesFrom(starts, -5) : null,
      join_closes_at: status === 'confirmed' ? minutesFrom(starts, 15) : null,
      // The room closes with the session (backend #380).
      door_closes_at: ['confirmed', 'completed', 'no_show'].includes(status)
        ? minutesFrom(starts, o.duration ?? 60)
        : null,
      created_at: at(-10, 9),
      mentee_attendance_rate: o.rate === undefined ? null : o.rate,
      // The form in brief, so a page of rows needs no extra call. `count`
      // matches what /sessions/{id}/answers returns for the same id.
      answers_preview: o.answers ?? null,
      // Another time the mentor offered. `held_until` is ahead for `active` and
      // behind for `expired`, so the countdown has something real to read.
      suggestion: o.suggestion
        ? {
            id: `sg-${id}`,
            starts_at: minutesFrom(starts, 24 * 60),
            duration_minutes: 60,
            held_until: minutesFrom(new Date().toISOString(), o.suggestion === 'active' ? 97 : -30),
            status: o.suggestion,
            booked_session_id: o.suggestion === 'booked' ? 'u-1' : null,
          }
        : null,
    };
  };

  // Sessions on the clock, for the join page (/sessions/j-1, j-2, j-3): one
  // inside its join window, one under way with the other side in, and one past
  // its join window that the viewer joined (Rejoin through the door).
  const fromNow = (m: number) => minutesFrom(CLOCK_ANCHOR, m);
  const all = [
    session('j-1', fromNow(3), 'confirmed', ['Amara', 'Okafor'], {
      typeName: '1:1 call',
      duration: 30,
      // Matches the two entries sessions/[sessionId]/answers returns for j-1.
      answers: {
        count: 2,
        first: {
          question_text: 'What would you like to talk about?',
          text: 'I’m applying to PhD programs in public health for Fall 2027 and don’t know how to pick between funded and unfunded offers.',
        },
      },
    }),
    session('j-3', fromNow(-20), 'confirmed', ['Kemi', 'Adebayo'], {
      typeName: 'SOP review',
      duration: 45,
      meJoinedAt: fromNow(-19),
      otherJoinedAt: fromNow(-18),
    }),
    session('j-2', fromNow(-10), 'confirmed', ['Gbenga', 'Ogundipe'], {
      typeName: '1:1 call',
      duration: 30,
      asMentee: true,
      otherJoinedAt: fromNow(-9),
    }),
    // Upcoming — the first is the hero.
    session('u-1', at(0, 23), 'confirmed', ['Taofeeq', 'Animasahun'], {
      topic: 'Statement of Purpose review',
      answers: {
        count: 4,
        first: {
          question_text: 'What do you want to cover?',
          text: 'My statement of purpose for the Chevening application. I have a second draft and I am not sure the opening paragraph says anything.',
        },
      },
      message:
        'I recently started my postgraduate scholarship application. I have attended several webinars and gathered useful information, and I need help reviewing my essays before the December deadline.',
      rate: 100,
    }),
    session('u-2', at(2, 9), 'confirmed', ['Amara', 'Okafor'], {
      topic: 'School shortlist',
      answers: {
        count: 2,
        first: {
          question_text: 'What do you want to cover?',
          text: 'I have nine programs and need to cut it to five. Funding matters most.',
        },
      },
      message: 'I have 9 programs and need to cut it to 5. Funding matters most.',
      rate: 92,
    }),
    session('u-3', at(5, 17), 'confirmed', ['Kwame', 'Asante'], {
      topic: 'Visa interview practice',
      // One answer: named, but with nothing more to see.
      answers: { count: 1, first: { question_text: 'Attach your CV', text: 'CV-2026.docx' } },
      zone: 'Africa/Accra',
    }),
    session('u-4', at(9, 14), 'confirmed', ['Ngozi', 'Ibe'], { topic: 'MPH personal statement' }),
    session('u-5', at(12, 10), 'confirmed', ['Yusuf', 'Kamara'], { topic: 'Quick CV check' }),
    session('u-6', at(16, 15), 'confirmed', ['Zainab', 'Musa'], {
      topic: 'Funding plan',
      zone: 'Pacific/Auckland',
    }),

    // Pending — one of them has already lapsed (respond_by in the past).
    session('p-1', at(4, 10), 'pending_mentor_approval', ['Chidi', 'Eze'], {
      topic: 'Scholarship essay review',
      message: 'Chevening essay, second draft.',
      respondBy: at(0, 20),
    }),
    session('p-2', at(7, 13), 'pending_mentor_approval', ['Halima', 'Yusuf'], {
      topic: 'Application timeline',
      respondBy: at(3, 9),
    }),
    // The viewer's own request, close to its deadline: the mentee-side pill.
    session('p-4', at(5, 15), 'pending_mentor_approval', ['Wanjiru', 'Kamau'], {
      topic: 'Research proposal',
      respondBy: at(0, 22),
      asMentee: true,
      zone: 'Africa/Nairobi',
    }),
    // And one with time to spare, so both mentee states show.
    session('p-5', at(12, 11), 'pending_mentor_approval', ['Kofi', 'Mensah'], {
      topic: 'Essay feedback',
      respondBy: at(6, 9),
      asMentee: true,
      zone: 'Africa/Accra',
    }),
    session('p-3', at(1, 11), 'pending_mentor_approval', ['Kofi', 'Mensah'], {
      topic: 'Mock interview',
      respondBy: at(-1, 9),
    }),

    // History — every outcome the API can send, including the three the design
    // never drew (declined, expired, withdrawn).
    session('h-1', at(-2, 14), 'completed', ['Amara', 'Okafor'], { topic: 'School shortlist' }),
    session('h-2', at(-9, 9), 'completed', ['Aladi', 'Peter'], {
      topic: 'Program selection',
      asMentee: true,
    }),
    // Cancelled with an offer whose hold has since lapsed.
    session('h-3', at(-14, 12), 'cancelled', ['Aladi', 'Peter'], {
      topic: 'Visa questions',
      asMentee: true,
      suggestion: 'expired',
    }),
    session('h-4', at(-21, 9), 'no_show', ['Oluwasayo', 'Ajewole'], { topic: 'Funding plan' }),
    session('h-5', at(-30, 15), 'declined', ['Wanjiru', 'Kamau'], {
      topic: 'Essay feedback',
      asMentee: true,
      // Declined, but another time offered and still held.
      suggestion: 'active',
    }),
    session('h-6', at(-45, 9), 'expired', ['Tunde', 'Bakare'], { topic: 'CV review' }),
    session('h-7', at(-60, 11), 'withdrawn', ['Efua', 'Owusu'], {
      topic: 'Research proposal',
      asMentee: true,
    }),
    session('h-8', at(-75, 9), 'completed', ['Pulane', 'Lebitsa'], { topic: 'Career guidance' }),
  ];

  const q = new URL(req.url).searchParams;
  const from = q.get('from');
  const to = q.get('to');
  const statuses = q.getAll('status');
  const asc = q.get('order') === 'asc';
  const rows = all
    .filter(
      (s) =>
        (!from || s.starts_at.slice(0, 10) >= from) &&
        (!to || s.starts_at.slice(0, 10) < to) &&
        (!statuses.length || statuses.includes(s.status)),
    )
    .sort((a, b) =>
      asc ? a.starts_at.localeCompare(b.starts_at) : b.starts_at.localeCompare(a.starts_at),
    );

  // Paged like the real thing, so the History "Show more" path — including the
  // 422 on a cursor from the other direction — can be exercised in dev.
  const limit = Math.min(Number(q.get('limit')) || 10, 50);
  const cursor = q.get('cursor');
  let offset = 0;
  if (cursor) {
    const parsed = /^o(d+)(a|d)$/.exec(cursor);
    // A cursor from the other ordering is a 422: restart from page 1.
    if (!parsed || parsed[2] !== (asc ? 'a' : 'd'))
      return NextResponse.json(
        { type: '/problems/bad-cursor', title: 'That cursor is no longer valid.', status: 422 },
        { status: 422, headers: { 'content-type': 'application/problem+json' } },
      );
    offset = Number(parsed[1]);
  }
  const page = rows.slice(offset, offset + limit);
  const next = offset + limit < rows.length ? `o${offset + limit}${asc ? 'a' : 'd'}` : null;
  return NextResponse.json({ data: page, next_cursor: next });
}
