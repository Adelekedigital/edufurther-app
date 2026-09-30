import { NextResponse } from 'next/server';
import {
  educationProblem,
  educationRead,
  mockEducation,
  setEducation,
} from '@/lib/api/mock/entries';

type Ctx = { params: Promise<{ userId: string; entryId: string }> };

/** MOCK of PATCH /api/v1/users/{id}/education/{entry_id}: only the fields sent. */
export async function PATCH(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId, entryId } = await ctx.params;
  const list = mockEducation(userId) ?? [];
  const found = list.find((e) => e.id === entryId);
  if (!found) return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const bad = body && typeof body === 'object' ? educationProblem(body, true) : '';
  if (bad !== null)
    return NextResponse.json(
      { title: 'Validation failed', status: 422, errors: [{ pointer: bad }] },
      { status: 422 },
    );
  const next = { ...found, ...body! } as typeof found;
  if (next.date_start && next.date_end && next.date_end < next.date_start)
    return NextResponse.json(
      { title: 'Validation failed', status: 422, errors: [{ pointer: '/date_end' }] },
      { status: 422 },
    );
  await new Promise((r) => setTimeout(r, 300));
  setEducation(
    userId,
    list.map((e) => (e.id === entryId ? next : e)),
    body!.is_most_recent === true ? entryId : undefined,
  );
  return NextResponse.json(educationRead(next));
}

/** MOCK of DELETE /api/v1/users/{id}/education/{entry_id}. */
export async function DELETE(_req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId, entryId } = await ctx.params;
  const list = mockEducation(userId) ?? [];
  if (!list.some((e) => e.id === entryId)) return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 300));
  setEducation(
    userId,
    list.filter((e) => e.id !== entryId),
  );
  return new NextResponse(null, { status: 204 });
}
