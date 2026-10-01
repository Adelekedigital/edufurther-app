import { NextResponse } from 'next/server';

const DAY = 24 * 60 * 60 * 1000;
const party = (id: string, first: string) => ({
  id,
  deleted: false,
  first_name: first,
  last_name: null,
  avatar_url: null,
  avatar_focus: null,
});

/**
 * MOCK of GET /api/v1/users/{id}/sessions: the user as mentor, newest start
 * first, one page. Two upcoming sessions (the month view's dots), one past.
 * ENABLE_MOCK_API=1 only.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 150));
  const at = (days: number, hourUtc: number) => {
    const d = new Date(Date.now() + days * DAY);
    d.setUTCHours(hourUtc, 0, 0, 0);
    return d.toISOString();
  };
  const session = (id: string, starts: string, status: string) => ({
    id,
    mentor_id: userId,
    mentee_id: 'mock-mentee',
    mentor: party(userId, 'Gbenga'),
    mentee: party('mock-mentee', 'Taofeeq'),
    session_type_id: null,
    status,
    starts_at: starts,
    duration_minutes: 60,
    topic: null,
    booking_message: null,
    meeting_provider: null,
    meeting_url: null,
    respond_by: null,
    join_opens_at: null,
    join_closes_at: null,
    created_at: at(-10, 9),
    mentee_attendance_rate: null,
  });
  return NextResponse.json({
    data: [
      session('s-3', at(9, 16), 'pending_mentor_approval'),
      session('s-2', at(3, 16), 'confirmed'),
      session('s-1', at(-5, 16), 'completed'),
    ],
    next_cursor: null,
  });
}
