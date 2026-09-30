import { NextResponse } from 'next/server';
import { awardProblem, mockAwards, setAwards } from '@/lib/api/mock/entries';

type Ctx = { params: Promise<{ userId: string; awardId: string }> };

/** MOCK of PATCH /api/v1/users/{id}/awards/{award_id}: only the fields sent. */
export async function PATCH(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId, awardId } = await ctx.params;
  const list = mockAwards(userId) ?? [];
  const found = list.find((a) => a.id === awardId);
  if (!found) return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const bad = body && typeof body === 'object' ? awardProblem(body, true) : '';
  if (bad !== null)
    return NextResponse.json(
      { title: 'Validation failed', status: 422, errors: [{ pointer: bad }] },
      { status: 422 },
    );
  await new Promise((r) => setTimeout(r, 300));
  const next = {
    ...found,
    ...('title' in body! && { title: String(body!.title).trim() }),
    ...('institution' in body! && { institution: String(body!.institution).trim() }),
    ...('year' in body! && { year: body!.year as number | null }),
    ...('funding' in body! && { funding: body!.funding as 'full' | 'partial' | null }),
  };
  setAwards(
    userId,
    list.map((a) => (a.id === awardId ? next : a)),
  );
  return NextResponse.json({ ...next, verification_status: 'unverified' });
}

/** MOCK of DELETE /api/v1/users/{id}/awards/{award_id}. */
export async function DELETE(_req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId, awardId } = await ctx.params;
  const list = mockAwards(userId) ?? [];
  if (!list.some((a) => a.id === awardId)) return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 300));
  setAwards(
    userId,
    list.filter((a) => a.id !== awardId),
  );
  return new NextResponse(null, { status: 204 });
}
