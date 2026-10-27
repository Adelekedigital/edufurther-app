import { NextResponse } from 'next/server';
import { addMockNote, mockNotes } from '@/lib/api/mock/adminMentors';
import { ok, okStatus, problem } from '@/lib/api/mock/respond';

type Ctx = { params: Promise<{ userId: string }> };

/** MOCK of GET /api/v1/admin/mentors/{user_id}/notes (A6), oldest first. */
export async function GET(_req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/admin/mentors/{user_id}/notes', 'get', {
    data: mockNotes(userId),
    next_cursor: null,
  });
}

/** MOCK of POST …/notes: 1–2,000 characters, appended. */
export async function POST(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const { body } = (await req.json().catch(() => ({}))) as { body?: unknown };
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text || text.length > 2000) return problem(422, { title: 'Validation failed' });
  await new Promise((r) => setTimeout(r, 300));
  return okStatus('/api/v1/admin/mentors/{user_id}/notes', 'post', 201, addMockNote(userId, text));
}
